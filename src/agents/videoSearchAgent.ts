import { StringOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables"
import { BaseMessage } from "langchain"
import { formatChatHistoryAsString } from "../utils/formatSearchHistory"
import { SearxngClient } from "../modules/search/searxng.client"
import { getSearxngApiEndpoint } from "../config"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"

type VideoSearchInput={
    chat_history:BaseMessage[]
    query:string
}

const videoSearchPrompt = `You will be given a conversation below and a follow up question. You need to rephrase the follow-up question so it is a standalone question that can be used by the LLM to search Youtube for videos.
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

const outputParser=new StringOutputParser();
const searxngClient=new SearxngClient(getSearxngApiEndpoint());

const createVideoSearchChain=(llm:BaseChatModel)=>{
    return RunnableSequence.from([
        RunnableMap.from({
            chat_history: (input:VideoSearchInput)=>formatChatHistoryAsString(input.chat_history),
            query: (input:VideoSearchInput)=>input.query,
        }),
        PromptTemplate.fromTemplate(videoSearchPrompt),
        llm,
        outputParser,
        RunnableLambda.from(async(input:string)=>{
            const result=await searxngClient.search(input,{
                engines:["youtube"],
            })
            const videos:{url:string,thumbnail_src:string,title:string,iframe_src:string}[]=[]
            result.results.forEach((res)=>{
                if(res.url && res.thumbnail_src && res.title && res.iframe_src){
                    videos.push({
                        url:res.url,
                        thumbnail_src:res.thumbnail_src,
                        title:res.title,
                        iframe_src:res.iframe_src,
                    })
                }
            })
        })
    ]);
}

const handleVideoSearch=(input:VideoSearchInput,llm:BaseChatModel)=>{
    const videoSearchChain=createVideoSearchChain(llm);
    return videoSearchChain.invoke(input);
}

export default handleVideoSearch;