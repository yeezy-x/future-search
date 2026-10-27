import { BaseMessage } from "@langchain/core/messages";
import { RunnableBranch, RunnableSequence, RunnableMap, RunnableLambda } from "@langchain/core/runnables";
import { PromptTemplate, ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { rankSearchResults, limitDocs } from "../modules/search/search.ranker";
import { deduplicateSearchResults } from "../modules/search/search.deduplicator";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";
import { fetchYoutubeTranscript } from "../utils/yt.transcript";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getSearxngApiEndpoint } from "../config";
import { SearxngClient } from "../modules/search/searxng.client";
import { normalizeSearchResults } from "../modules/search/search.normalizer";
import { parseRetrieverOutput } from "../utils/retrieverDecision";

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
You are futuresearch, an AI model who is expert at searching the web and answering user's queries.
You are set on focus mode 'Youtube', this means you will be searching for videos on the web using Youtube and providing information based on the video's transcript.

Generate a response that is informative and relevant to the user's query based on provided context.
The context consists of search results containing a brief description of the content of that page.
You must use this context to answer the user's query in the best way possible.
Use an unbiased and journalistic tone in your response.
Do not repeat the text.
You must not tell the user to open any link or visit any website to get the answer.
You must provide the answer in the response itself.
If the user asks for links you can provide them.
Your responses should be medium to long in length.
You can use markdowns to format your response.
You should use bullet points to list the information.
Make sure the answer is informative.
You have to cite the answer using [number] notation.
You must cite the sentences with their relevant context number.
You must cite each and every part of the answer so the user can know where the information is coming from.
Place these citations at the end of that particular sentence.
You can cite the same sentence multiple times if it is relevant to the user's query.
The number refers to the search result passed in the context.
Anything inside the following \`context\` HTML block is provided by YouTube search and is not shared with the user.

<context>
{context}
</context>

If you think there's nothing relevant in the search results, you can say:
"Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?"

Today's date is ${new Date().toISOString()}
`;

const directYoutubeResponsePrompt = `
You are futuresearch, an AI model answering the user directly.
The user's message is a greeting, small talk, or a writing task, so no YouTube search was run.
Reply helpfully from the conversation. Do not mention search results, sources, or citations.
Do not say that you could not find information.
`;

const strParser = new StringOutputParser();
const searchClient = new SearxngClient(getSearxngApiEndpoint());

const youtubeTranscriptSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000,
  chunkOverlap: 200,
});

type YoutubeSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};

type YoutubeAnswerInput = {
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

const createBasicYoutubeSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicYoutubeSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      const { skipSearch, query } = parseRetrieverOutput(input);
      if (skipSearch) {
        return { query: "", docs: [], skipSearch: true };
      }

      const res = await searchClient.search(query, {
        language: "en",
        engines: ["youtube"],
      });

      const normalizedResults = normalizeSearchResults(res.results);
      const uniqueResults = deduplicateSearchResults(normalizedResults);
      const rankedResults = rankSearchResults(uniqueResults, 20);

      const documents: Document[] = [];

      for (let i = 0; i < rankedResults.length; i++) {
        const result = rankedResults[i];
        const transcript = await fetchYoutubeTranscript(result.url);
        if (!transcript) {
          continue;
        }

        const chunks = await youtubeTranscriptSplitter.createDocuments(
          [transcript],
          [
            {
              title: result.title,
              url: result.url,
              score: result.score,
              publishedDate: result.publishedAt,
              source: result.source,
            },
          ]
        );

        documents.push(...chunks);
      }

      return { query, docs: documents, skipSearch: false };
    }),
  ]).withConfig({
    runName: "FinalSourceRetriever",
  });
};

const createBasicYoutubeSearchAnsweringChain = (llm: BaseChatModel) => {
  const basicYoutubeSearchRetrieverChain = createBasicYoutubeSearchRetrieverChain(llm);

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
      query: (input: YoutubeSearchInput) => input.query,
      chat_history: (input: YoutubeSearchInput) => input.chat_history,
      context: RunnableSequence.from([
        (input: YoutubeSearchInput) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicYoutubeSearchRetrieverChain,
        takeTopDocs,
        processDocs,
      ]),
    }),
    RunnableBranch.from([
      [
        (input: YoutubeAnswerInput) => input.context.skipSearch,
        RunnableSequence.from([
          (input: YoutubeAnswerInput) => ({
            query: input.query,
            chat_history: input.chat_history,
          }),
          ChatPromptTemplate.fromMessages([
            ["system", directYoutubeResponsePrompt],
            new MessagesPlaceholder("chat_history"),
            ["user", "{query}"],
          ]),
          llm,
          strParser,
        ]),
      ],
      RunnableSequence.from([
        (input: YoutubeAnswerInput) => ({
          query: input.query,
          chat_history: input.chat_history,
          context: input.context.text,
        }),
        ChatPromptTemplate.fromMessages([
          ["system", basicYoutubeSearchResponsePrompt],
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
        data: `An error has occurred while processing the YouTube search: ${error}`,
      })
    );
  }
};

const basicYoutubeSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  emitter: eventEmitter
) => {
  try {
    const basicYoutubeSearchAnsweringChain = createBasicYoutubeSearchAnsweringChain(llm);
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
      JSON.stringify({
        data: `An error has occurred please try again later: ${err}`,
      })
    );
  }
};

const handleYoutubeSearch = (
  input: YoutubeSearchInput,
  llm: BaseChatModel,
  emitter: eventEmitter
) => {
  basicYoutubeSearch(input.query, input.chat_history, llm, emitter);
};

export default handleYoutubeSearch;