import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { getSearxngApiEndpoint } from "../config";
import { SearxngClient } from "../modules/search/searxng.client";
import type { BaseMessage } from "@langchain/core/messages";
import { formatChatHistoryAsString } from "../utils/formatSearchHistory";

const imageSearchChainPrompt = `
You will be given a conversation below and a follow up 
question. You need to rephrase the follow-up question so
it is a standalone question that can be used by the LLM 
to search the web for images.
You need to make sure the rephrased question agrees with 
the conversation and is relevant to the conversation.
Example:
1. Follow up question: What is a cat?
Rephrased: A cat
2. Follow up question: What is a car? How does it works?
Rephrased: Car working
3. Follow up question: How does an AC work?
Rephrased: AC working
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

type ImageSearchChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

type ImageResult = {
  img_src: string;
  url: string;
  title: string;
};

const strParser = new StringOutputParser();
const searxngClient = new SearxngClient(getSearxngApiEndpoint());

const searchImages = async (searchQuery: string): Promise<ImageResult[]> => {
  const res = await searxngClient.search(searchQuery, {
    categories: ["images"],
    engines: ["bing images", "google images"],
  });

  const images: ImageResult[] = [];

  res.results.forEach((result) => {
    if (result.img_src && result.url && result.title) {
      images.push({
        img_src: result.img_src,
        url: result.url,
        title: result.title,
      });
    }
  });
  return images.slice(0, 10);
};

const createRephraseChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: ImageSearchChainInput) => {
        return formatChatHistoryAsString(input.chat_history);
      },
      query: (input: ImageSearchChainInput) => {
        return input.query;
      },
    }),
    PromptTemplate.fromTemplate(imageSearchChainPrompt),
    llm,
    strParser,
  ]);
};

const handleImageSearch = async (
  input: ImageSearchChainInput,
  llm: BaseChatModel
): Promise<ImageResult[]> => {
  let searchQuery = input.query.trim();
  try {
    const rephraseOriginalMessage = createRephraseChain(llm);
    const rephrased = (await rephraseOriginalMessage.invoke(input)).trim();
    if (rephrased) searchQuery = rephrased;
  } catch (err) {
    console.warn(
      "[IMAGE SEARCH] LLM rephrase failed, using original query:",
      err instanceof Error ? err.message : err
    );
  }
  return searchImages(searchQuery);
};

export default handleImageSearch;
