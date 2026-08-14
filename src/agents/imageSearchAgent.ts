import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { getSearxngApiEndpoint } from "../config";
import { SearxngClient } from "../modules/search/searxng.client";
import type { BaseMessage } from "@langchain/core/messages";

const imageSearchChainPrompt=`
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

const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join("\n");
};

const strParser=new StringOutputParser();
const searxngClient=new SearxngClient(getSearxngApiEndpoint());

const createImageSearchChain=(llm:BaseChatModel)=>{
    return RunnableSequence.from([
        RunnableMap.from({
            chat_history:(input:ImageSearchChainInput)=>{
                return formatChatHistoryAsString(input.chat_history);
            },
            query:(input:ImageSearchChainInput)=>{
                return input.query;
            }
        }),
        PromptTemplate.fromTemplate(imageSearchChainPrompt),
        llm,
        strParser,
        RunnableLambda.from(async (input:string)=>{
            console.log("\n========== IMAGE SEARCH ==========");
            console.log("Rewritten query:", input);
            const res=await searxngClient.search(input,{
                categories:["images"],
                engines:["bing images","google images"]
            })
            console.log(
                "SearXNG results:",
                res.results.length
            );
            console.log("SearXNG results:",res.results);
            const images: {img_src:string,url:string,title:string}[] = [];
            res.results.forEach((result)=>{
                if (result.img_src && result.url && result.title) {
                    images.push({
                      img_src: result.img_src,
                      url: result.url,
                      title: result.title,
                    });
                  }
            })
            console.log("Valid images:",images);
            return images.slice(0,10);
        })
    ])
}

const handleImageSearch=(
    input:ImageSearchChainInput,
    llm:BaseChatModel
)=>{
    const imageSearchChain=createImageSearchChain(llm);
    console.log("imageSearchChain:",imageSearchChain);
    return imageSearchChain.invoke(input);
}

export default handleImageSearch;