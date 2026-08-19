import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { BaseMessage } from "@langchain/core/messages";
import { getSearxngApiEndpoint } from "../config";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SearxngClient } from "../modules/search/searxng.client";
import { RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { normalizeSearchResults } from "../modules/search/search.normalizer";
import { deduplicateSearchResults } from "../modules/search/search.deduplicator";
import { rankSearchResults, rerankDocs } from "../modules/search/search.ranker";
import { Embeddings } from "@langchain/core/embeddings";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import eventEmitter from "events";
import { Document } from "langchain";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";

const basicSearchRetrieverPrompt = `
  You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the web for information.
  If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
  Example:
  1. Follow up question: What is the capital of France?
  Rephrased: Capital of france
  2. Follow up question: What is the population of New York City?
  Rephrased: Population of New York City
  3. Follow up question: What is Docker?
  Rephrased: What is Docker
  Conversation:{chat_history}
  Follow up question: {query}
  Rephrased question:
`;

const basicWebSearchResponsePrompt = `
  You are futuresearch, an AI model who is expert at searching the web and answering user's queries.

  Generate a response that is informative and relevant to the user's query based on provided context (the context consits of search results containg a brief description of the content of that page).
  You must use this context to answer the user's query in the best way possible. Use an unbaised and journalistic tone in your response. Do not repeat the text.
  You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.
  Your responses should be medium to long in length be informative and relevant to the user's query. You can use markdowns to format your response. You should use bullet points to list the information. Make sure the answer is not short and is informative.
  You have to cite the answer using [number] notation. You must cite the sentences with their relevent context number. You must cite each and every part of the answer so the user can know where the information is coming from.
  Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
  However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

  Aything inside the following \`context\` HTML block provided below is for your knowledge returned by the search engine and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to 
  talk about the context in your response. 

  <context>
  {context}
  </context>

  If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?'.
  Anything between the \`context\` is retrieved from a search engine and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  console.log("[4] Handling stream");

  try {
    for await (const event of stream) {
      // -----------------------------------------
      // DEBUG: See what LangChain is emitting
      // -----------------------------------------
      console.log(
        "\n========== STREAM EVENT =========="
      );

      console.log("event:", event.event);
      console.log("name:", event.name);
      console.log(
        "data:",
        JSON.stringify(event.data, null, 2)
      );

      console.log(
        "==================================\n"
      );

      // -----------------------------------------
      // 1. Search sources are ready
      // -----------------------------------------
      if (
        event.event === "on_chain_end" &&
        event.name === "FinalSourceRetriever"
      ) {
        console.log("[5] Sources retrieved");

        emitter.emit(
          "data",
          JSON.stringify({
            type: "sources",
            data: event.data.output,
          })
        );
      }

      // -----------------------------------------
      // 2. Response token/chunk received
      // -----------------------------------------
      if (
        event.event === "on_chain_stream" &&
        event.name === "FinalResponseGenerator"
      ) {
        const chunk = event.data?.chunk;

        // Ignore empty chunks
        if (!chunk) {
          continue;
        }

        console.log(
          "[6] Response chunk:",
          JSON.stringify(chunk)
        );

        emitter.emit(
          "data",
          JSON.stringify({
            type: "response",
            data: chunk,
          })
        );
      }

      // -----------------------------------------
      // 3. Final response completed
      // -----------------------------------------
      if (
        event.event === "on_chain_end" &&
        event.name === "FinalResponseGenerator"
      ) {
        console.log("[7] Response generation completed");

        emitter.emit("end");
      }
    }

    console.log("[8] Stream finished");

  } catch (error) {
    console.error("[STREAM ERROR]", error);

    emitter.emit(
      "error",
      JSON.stringify({
        data: "An error occurred while processing the response.",
      })
    );
  }
};

type WebSearchChainInput={
  query:string;
  chat_history:BaseMessage[];  
}
  
const strParser = new StringOutputParser();
const searchClient = new SearxngClient(getSearxngApiEndpoint());

const createBasicWebSearchRetrieverChain=(llm:BaseChatModel)=>{
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input:string)=>{
      console.log("[SEARCH 1] Search query:", input);
      if(input=="not_needed"){
        return {query:"", docs:[]}
      }
      const res = await searchClient.search(input, {
        categories: ["general"],
        language: "en",
      });
      console.log("[SEARCH 2] SearXNG returned");
  console.log("[SEARCH 3] Result count:", res.results.length);
      // 1. Normalize SearXNG results
      const normalizedResults = normalizeSearchResults(res.results);
      console.log(`SearXNG results: ${res.results.length}`);
      console.log(`After normalization: ${normalizedResults.length}`);
      console.log("[SEARCH 4] Normalized results:", normalizedResults);
      // 2. Remove duplicate URLs
      const uniqueResults = deduplicateSearchResults(normalizedResults);
      console.log(`After deduplication: ${uniqueResults.length}`);
      console.log("[SEARCH 5] Unique results:", uniqueResults);
      const rankedResults = rankSearchResults(uniqueResults, 20);
      console.log(`After ranking: ${rankedResults.length}`);
      console.log("[SEARCH 6] Ranked results:", rankedResults);
      // 3. Convert our internal SearchResult
      //    into LangChain Documents
      const documents = rankedResults.map(
        (result) =>
          new Document({
            pageContent: result.content ?? "",
            metadata: {
              title: result.title,
              url: result.url,
              source: result.source,
              score: result.score,
              publishedAt: result.publishedAt,
            },
          })
      );
      console.log("[SEARCH 7] Documents:", documents);
      return {
        query: input,
        docs: documents,
      }
    })
  ])
}

const createBasicWebSearchAnsweringChain=(llm:BaseChatModel,embeddings:Embeddings)=>{
  const basicWebSearchRetrieverChain=createBasicWebSearchRetrieverChain(llm);
  const semanticReranking = RunnableLambda.from(
    async (input: {
      query: string;
      docs: Document[];
    }) => {
      console.log("[RERANK 1] Starting reranking");
      console.log("[RERANK 2] Documents:", input.docs.length);
      console.log("[RERANK 3] Query:", input.query);      
      return {
        query: input.query, 
        docs: await rerankDocs({
          query: input.query,
          docs: input.docs,
          embeddings,
          limit: 10,
          threshold: 0.5,
        }),
      };
    }
  );
  const processDocs = RunnableLambda.from(
    async (input:{
      query:string;
      docs:Document[];
    }) => {
    console.log("[PROCESS DOCS 1] Processing documents");
    console.log("[PROCESS DOCS 2] Query:", input.query);
    console.log("[PROCESS DOCS 3] Documents:", input.docs);
      return input.docs
        .map((doc, index) => {
          return [
            `[${index + 1}]`,
            `Title: ${doc.metadata.title}`,
            `URL: ${doc.metadata.url}`,
            `Content: ${doc.pageContent}`,
          ].join("\n");
        })
        .join("\n\n");
    }
  )
  console.log("[PROCESS DOCS 3] RunnableSequence created");
  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: WebSearchChainInput) => input.query,
      chat_history: (input: WebSearchChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicWebSearchRetrieverChain,
        semanticReranking,
        processDocs,
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicWebSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
}

const basicWebSearch=(
  input:WebSearchChainInput,
  llm:BaseChatModel,
  embeddings:Embeddings
)=>{
  console.log("[2] Creating event emitter");
  const event=new eventEmitter();
  try{
    const basicWebSearchAnsweringChain=createBasicWebSearchAnsweringChain(llm,embeddings)
    const stream=basicWebSearchAnsweringChain.streamEvents(
      input,
      {version:"v1"}
    )
    console.log("[3] Stream created");
    handleStream(stream,event)
  }catch(err){
    event.emit("error",
      JSON.stringify({
        data:`An error has occurred please try again later: ${err}`
      })
    )
  }
  return event;
}

const handleWebSearch=async (
    input:WebSearchChainInput,
    llm:BaseChatModel,
    embeddings:Embeddings
)=>{
  //start an event 
  console.log("[1] Starting WebSearchAgent");
  const eventEmitter=basicWebSearch(input,llm,embeddings)
  return eventEmitter;
}

export default handleWebSearch;