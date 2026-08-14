import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { BaseMessage } from "@langchain/core/messages";
import { getSearxngApiEndpoint } from "../config";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SearxngClient } from "../modules/search/searxng.client";
import { Runnable, RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { normalizeSearchResults } from "../modules/search/search.normalizer";

const webSearchChainPrompt = `
You will be given a conversation and a follow-up question.
Rewrite the follow-up question into a standalone web search query.
The query should:
- preserve the important context from the conversation
- be concise
- be suitable for a web search engine
- contain only the search query
- do not include explanations
- do not include labels such as "Search query:" or "Rephrased question:"
Conversation:
{chat_history}
Follow-up question:
{query}
Standalone search query:
`;

type WebSearchChainInput={
    chat_history:BaseMessage[];
    query:string;
}

const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history.map(
        (message) =>
        `${message._getType()}: ${message.content}`
    ).join("\n");
};
  
const strParser = new StringOutputParser();
const searchClient = new SearxngClient(getSearxngApiEndpoint());

const createWebSearchChain = (
    llm: BaseChatModel
  ) => {
    return RunnableSequence.from([
      RunnableMap.from({
        chat_history: (input: WebSearchChainInput) => {
          return formatChatHistoryAsString(
            input.chat_history
          );
        },
        query: (input: WebSearchChainInput) => input.query,
      }),
      PromptTemplate.fromTemplate(webSearchChainPrompt),
      llm,
      strParser,
      RunnableLambda.from(
        async (input: string) => {
          console.log("Web search query:",input);
          const res = await searchClient.search(input, {categories: ["general"]});
          
          const results = normalizeSearchResults(res.results);
          return results;
        }
      ),
    ]);
  };

const handleWebSearch=async (
    input:WebSearchChainInput,
    llm:BaseChatModel
)=>{
    const webSearchChain=createWebSearchChain(llm);
    return webSearchChain.invoke(input);
}

export default handleWebSearch