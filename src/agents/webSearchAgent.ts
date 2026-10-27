import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage } from "@langchain/core/messages";
import { getSearxngApiEndpoint } from "../config";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SearxngClient } from "../modules/search/searxng.client";
import { RunnableBranch, RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { normalizeSearchResults } from "../modules/search/search.normalizer";
import { deduplicateSearchResults } from "../modules/search/search.deduplicator";
import { rankSearchResults, limitDocs } from "../modules/search/search.ranker";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import eventEmitter, { EventEmitter } from "events";
import { Document } from "langchain";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";
import { parseRetrieverOutput } from "../utils/retrieverDecision";

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

const directWebResponsePrompt = `
You are futuresearch, an AI model answering the user directly.
The user's message is a greeting, small talk, or a writing task, so no web search was run.
Reply helpfully from the conversation. Do not mention search results, sources, or citations.
Do not say that you could not find information.
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
        const chunk = event.data?.chunk;

        if (!chunk) {
          continue;
        }

        emitter.emit(
          "data",
          JSON.stringify({
            type: "response",
            data: chunk,
          })
        );
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
        data: "An error occurred while processing the response.",
      })
    );
  }
};

type WebSearchChainInput = {
  query: string;
  chat_history: BaseMessage[];
};

type WebAnswerInput = {
  query: string;
  chat_history: BaseMessage[];
  context: {
    text: string;
    skipSearch: boolean;
  };
};

type RetrieverResult = {
  query: string;
  docs: Document[];
  skipSearch: boolean;
};

const strParser = new StringOutputParser();
const searchClient = new SearxngClient(getSearxngApiEndpoint());

const createBasicWebSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      const { skipSearch, query } = parseRetrieverOutput(input);
      if (skipSearch) {
        return { query: "", docs: [], skipSearch: true };
      }

      const res = await searchClient.search(query, {
        categories: ["general"],
        language: "en",
      });

      const normalizedResults = normalizeSearchResults(res.results);
      const uniqueResults = deduplicateSearchResults(normalizedResults);
      const rankedResults = rankSearchResults(uniqueResults, 20);

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

      return { query, docs: documents, skipSearch: false };
    }),
  ]).withConfig({
    runName: "FinalSourceRetriever",
  });
};

const createBasicWebSearchAnsweringChain = (llm: BaseChatModel) => {
  const basicWebSearchRetrieverChain = createBasicWebSearchRetrieverChain(llm);

  const takeTopDocs = RunnableLambda.from(async (input: RetrieverResult) => ({
    query: input.query,
    docs: limitDocs(input.docs, 10),
    skipSearch: input.skipSearch,
  }));

  const processDocs = RunnableLambda.from(async (input: RetrieverResult) => ({
    text: input.docs
      .map((doc, index) =>
        [
          `[${index + 1}]`,
          `Title: ${doc.metadata.title}`,
          `URL: ${doc.metadata.url}`,
          `Content: ${doc.pageContent}`,
        ].join("\n")
      )
      .join("\n\n"),
    skipSearch: input.skipSearch,
  }));

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: WebSearchChainInput) => input.query,
      chat_history: (input: WebSearchChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input: WebSearchChainInput) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicWebSearchRetrieverChain,
        takeTopDocs,
        processDocs,
      ]),
    }),
    RunnableBranch.from([
      [
        (input: WebAnswerInput) => input.context.skipSearch,
        RunnableSequence.from([
          (input: WebAnswerInput) => ({
            query: input.query,
            chat_history: input.chat_history,
          }),
          ChatPromptTemplate.fromMessages([
            ["system", directWebResponsePrompt],
            new MessagesPlaceholder("chat_history"),
            ["user", "{query}"],
          ]),
          llm,
          strParser,
        ]),
      ],
      RunnableSequence.from([
        (input: WebAnswerInput) => ({
          query: input.query,
          chat_history: input.chat_history,
          context: input.context.text,
        }),
        ChatPromptTemplate.fromMessages([
          ["system", basicWebSearchResponsePrompt],
          new MessagesPlaceholder("chat_history"),
          ["user", "{query}"],
        ]),
        llm,
        strParser,
      ]),
    ]),
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const basicWebSearch = (input: WebSearchChainInput, llm: BaseChatModel, emitter: EventEmitter) => {
  try {
    const basicWebSearchAnsweringChain = createBasicWebSearchAnsweringChain(llm);
    const stream = basicWebSearchAnsweringChain.streamEvents(input, { version: "v1" });
    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit("error", JSON.stringify({ data: `An error has occurred please try again later: ${err}` }));
  }
};

const handleWebSearch = async (input: WebSearchChainInput, llm: BaseChatModel, emitter: EventEmitter) => {
  basicWebSearch(input, llm, emitter);
};

export default handleWebSearch;