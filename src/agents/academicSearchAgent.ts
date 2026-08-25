import { Embeddings } from "@langchain/core/embeddings";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import { BaseMessage, context, Document } from "langchain";
import eventEmitter from "events";
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { SearxngClient } from "../modules/search/searxng.client";
import { normalizeSearchResults } from "../modules/search/search.normalizer";
import { deduplicateSearchResults } from "../modules/search/search.deduplicator";
import { rankSearchResults, rerankDocs } from "../modules/search/search.ranker";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";
import { getSearxngApiEndpoint } from "../config";

type AcademicSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};

const basicAcademicSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the web for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
Example:
1. Follow up question: How does stable diffusion work?
Rephrased: Stable diffusion working
2. Follow up question: What is linear algebra?
Rephrased: Linear algebra
3. Follow up question: What is the third law of thermodynamics?
Rephrased: Third law of thermodynamics
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

const basicAcademicSearchResponsePrompt = `
You are futuresearch, an AI model who is expert at searching the web and answering user's queries. You are set on focus mode 'Academic', this means you will be searching for academic papers and articles on the web.
Generate a response that is informative and relevant to the user's query based on provided context (the context consists of search results containing a brief description of the content of that page).
You must use this context to answer the user's query in the best way possible. Use an unbiased and journalistic tone in your response. Do not repeat the text.
You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.
Your responses should be medium to long in length be informative and relevant to the user's query. You can use markdowns to format your response. You should use bullet points to list the information. Make sure the answer is not short and is informative.
You have to cite the answer using [number] notation. You must cite the sentences with their relevant context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.
Anything inside the following \`context\` HTML block provided below is for your knowledge returned by the search engine and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to 
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
  try {
    for await (const event of stream) {
      if (
        event.event === "on_chain_end" &&
        event.name === "FinalSourceRetriever"
      ) {
        emitter.emit(
          "data",
          JSON.stringify({
            type: "sources",
            data: event.data.output.docs,
          })
        );
      }

      if (
        event.event === "on_chain_stream" &&
        event.name === "FinalResponseGenerator"
      ) {
        const chunk = event.data.chunk;

        if (chunk) {
          emitter.emit(
            "data",
            JSON.stringify({
              type: "response",
              data: chunk,
            })
          );
        }
      }

      if (
        event.event === "on_chain_end" &&
        event.name === "FinalResponseGenerator"
      ) {
        emitter.emit("end");
      }
    }
  } catch (error) {
    emitter.emit(
      "error",
      JSON.stringify({
        data: error instanceof Error ? error.message : "Academic search stream failed",
      })
    );
  }
};

const strParser = new StringOutputParser();
const searchClient = new SearxngClient(getSearxngApiEndpoint());

const createBasicAcademicSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicAcademicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      if (input == "not_needed") {
        return { query: "", docs: [] };
      }

      const res = await searchClient.search(input, {
        language: "en",
        engines: [
          "arxiv",
          "google scholar",
          "internetarchivescholar",
          "pubmed",
        ],
      });
      
      const normalizedResults = normalizeSearchResults(res.results);
      const uniqueResults = deduplicateSearchResults(normalizedResults);
      const rankedResults = rankSearchResults(uniqueResults, 20);
      
      const documents = rankedResults.map(
        (result) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
              source: result.source,
              score: result.score,
              publishedAt: result.publishedAt,
            },
          })
      );
      
      return { query: input, docs: documents };
    }),
  ]).withConfig({
    runName: "FinalSourceRetriever",
  });
};

const createBasicAcademicSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicAcademicSearchRetrieverChain = createBasicAcademicSearchRetrieverChain(llm);

  const semanticReranking = RunnableLambda.from(
    async (input: { query: string; docs: Document[] }) => {
      const rerankedDocs = await rerankDocs({
        query: input.query,
        docs: input.docs,
        embeddings,
        limit: 10,
        threshold: 0.5,
      });
      
      return {
        query: input.query,
        docs: rerankedDocs,
      };
    }
  );

  const processDocs = RunnableLambda.from(
    async (input: { query: string; docs: Document[] }) => {
      const context = input.docs
        .map((doc, index) => {
          return [
            `[${index + 1}]`,
            `Title: ${doc.metadata.title}`,
            `URL: ${doc.metadata.url}`,
            `Content: ${doc.pageContent}`,
          ].join("\n");
        })
        .join("\n\n");

      return context;
    }
  );
  
  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: AcademicSearchInput) => input.query,
      chat_history: (input: AcademicSearchInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicAcademicSearchRetrieverChain,
        semanticReranking,
        processDocs,
      ]),
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicAcademicSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const basicAcademicSearch = (
  input: AcademicSearchInput,
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();
  try {
    const basicAcademicSearchAnsweringChain = createBasicAcademicSearchAnsweringChain(llm, embeddings);
    const stream = basicAcademicSearchAnsweringChain.streamEvents(input, { version: "v1" });
    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({
        data: `An error has occurred please try again later: ${err}`,
      })
    );
  }
  return emitter;
};

const handleAcademicSearch = (
  input: AcademicSearchInput,
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const eventEmitter = basicAcademicSearch(input, llm, embeddings);
  return eventEmitter;
};

export default handleAcademicSearch;