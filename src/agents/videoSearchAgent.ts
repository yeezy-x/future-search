import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";
import { SearxngClient } from "../modules/search/searxng.client";
import { getSearxngApiEndpoint } from "../config";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

type VideoSearchInput = {
  chat_history: BaseMessage[];
  query: string;
};

type VideoResult = {
  thumbnail: string;
  iframe_src: string;
  title: string;
  url: string;
};

const videoSearchPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question so it is a standalone question that can be used by the LLM to search Youtube for videos.
You need to make sure the rephrased question agrees with the conversation and is relevant to the conversation.
Example:
1. Follow up question: How does a car work?
Rephrased: How does a car work?
2. Follow up question: What is the theory of relativity?
Rephrased: What is theory of relativity
3. Follow up question: How does an AC work?
Rephrased: How does an AC work
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

const outputParser = new StringOutputParser();
const searxngClient = new SearxngClient(getSearxngApiEndpoint());

const searchYoutube = async (searchQuery: string): Promise<VideoResult[]> => {
  const result = await searxngClient.search(searchQuery, {
    engines: ["youtube"],
  });

  const videos: VideoResult[] = [];
  result.results.forEach((item) => {
    const thumbnail = item.thumbnail || item.thumbnail_src;
    if (thumbnail && item.iframe_src && item.title && item.url) {
      videos.push({
        thumbnail,
        iframe_src: item.iframe_src,
        title: item.title,
        url: item.url,
      });
    }
  });

  return videos.slice(0, 10);
};

const createRephraseChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: VideoSearchInput) =>
        formatChatHistoryAsString(input.chat_history),
      query: (input: VideoSearchInput) => input.query,
    }),
    PromptTemplate.fromTemplate(videoSearchPrompt),
    llm,
    outputParser,
  ]);
};

const handleVideoSearch = async (
  input: VideoSearchInput,
  llm: BaseChatModel
): Promise<VideoResult[]> => {
  let searchQuery = input.query.trim();

  try {
    const rephraseOriginalMessage = createRephraseChain(llm);
    const rephrased = (await rephraseOriginalMessage.invoke(input)).trim();
    if (rephrased) searchQuery = rephrased;
  } catch (err) {
    console.warn(
      "[VIDEO SEARCH] LLM rephrase failed, using original query:",
      err instanceof Error ? err.message : err
    );
  }

  return searchYoutube(searchQuery);
};

export default handleVideoSearch;
