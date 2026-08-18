import { ChatOpenAI, OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import {
  PromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { getSearxngApiEndpoint } from "../config";
import { SearxngClient } from "../modules/search/searxng.client";
import { normalizeSearchResults } from "../modules/search/search.normalizer";
import { rankSearchResults, rerankDocs } from "../modules/search/search.ranker";
import { deduplicateSearchResults } from "../modules/search/search.deduplicator";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";

const basicYoutubeSearchRetrieverPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the web for information.
If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.
Example:
1. Follow up question: How does an A.C work?
Rephrased: A.C working
2. Follow up question: Linear algebra explanation video
Rephrased: What is linear algebra?
3. Follow up question: What is theory of relativity?
Rephrased: What is theory of relativity?
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

const basicYoutubeSearchResponsePrompt = `
You are futuresearch, an AI model who is expert at searching the web and answering user's queries. You are set on focus mode 'Youtube', this means you will be searching for videos on the web using Youtube and providing information based on the video's transcript.
Generate a response that is informative and relevant to the user's query based on provided context (the context consits of search results containg a brief description of the content of that page).
You must use this context to answer the user's query in the best way possible. Use an unbaised and journalistic tone in your response. Do not repeat the text.
You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.
Your responses should be medium to long in length be informative and relevant to the user's query. You can use markdowns to format your response. You should use bullet points to list the information. Make sure the answer is not short and is informative.
You have to cite the answer using [number] notation. You must cite the sentences with their relevent context number. You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.
Aything inside the following \`context\` HTML block provided below is for your knowledge returned by Youtube and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to 
talk about the context in your response. 
<context>
{context}
</context>
If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?'.
Anything between the \`context\` is retrieved from Youtube and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;

const strParser = new StringOutputParser();
const searchClient=new SearxngClient(getSearxngApiEndpoint());

type YoutubeSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createBasicYoutubeSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicYoutubeSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      if (input === "not_needed") {
        return { query: "", docs: [] };
      }

      const res = await searchClient.search(input, {
        language: "en",
        engines: ["youtube"],
      });
      const normalizedResults = normalizeSearchResults(res.results);
      console.log(`SearXNG results: ${res.results.length}`);
      console.log(`After normalization: ${normalizedResults.length}`);
      const uniqueResults = deduplicateSearchResults(normalizedResults);
      console.log(`After deduplication: ${uniqueResults.length}`);
      const rankedResults = rankSearchResults(uniqueResults, 20);
      console.log(`After ranking: ${rankedResults.length}`);

      const documents = rankedResults.map(
        (result) =>
          new Document({
            pageContent: result.content || "",
            metadata: {
              title: result.title,
              url: result.url,
              score: result.score,
              publishedDate: result.publishedAt,
            },
          })
      );
      return { query: input, docs: documents };
    }),
  ]);
};

const createBasicYoutubeSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const basicYoutubeSearchRetrieverChain = createBasicYoutubeSearchRetrieverChain(llm);
  const semanticReranking = RunnableLambda.from(async (input: {
    query: string;
    docs: Document[];
  }) => {
    return {
      query: input.query,
      docs: await rerankDocs({
        query: input.query,
        docs: input.docs,
        embeddings,
        limit: 10,
        threshold: 0.5,
      }),
    }
  })
  const processDocs = RunnableLambda.from(async (docs: Document[]) => {
    return docs
    .map((doc,index) => {
      return [
        `[${index+1}]`,
        `Title: ${doc.metadata.title}`,
        `URL: ${doc.metadata.url}`,
        `Content: ${doc.pageContent}`,
      ].join("\n");
    })
    .join("\n\n");
  })
  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: YoutubeSearchInput) => input.query,
      chat_history: (input: YoutubeSearchInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicYoutubeSearchRetrieverChain,
        semanticReranking,
        processDocs
      ])
    }),
    ChatPromptTemplate.fromMessages([
      ["system", basicYoutubeSearchResponsePrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({runName: "FinalResponseGenerator"})
};

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  for await (const event of stream) {
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalSourceRetriever"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "sources", data: event.data.output })
      );
    }
    if (
      event.event === "on_chain_stream" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "response", data: event.data.chunk })
      );
    }
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit("end");
    }
  }
};

const basicYoutubeSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = new eventEmitter();

  try {
    const basicYoutubeSearchAnsweringChain =
      createBasicYoutubeSearchAnsweringChain(llm, embeddings);
    const stream = basicYoutubeSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: "v1",
      }
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
    console.error(err);
  }

  return emitter;
};

const handleYoutubeSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const emitter = basicYoutubeSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleYoutubeSearch;