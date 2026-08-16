import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { Router } from "express";
import { getAvailableProviders } from "../modules/ai/model.factory";
import { getChatModel, getChatModelProvider } from "../config";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";

const suggestionsRouter=Router();

suggestionsRouter.post("/suggest",async (req, res)=>{
    try{
        const {chat_history}=req.body;
        chat_history.map((msg:any)=>{
            if(msg.role==="user"){
                return new HumanMessage(msg.content);
            }else{
                return new AIMessage(msg.content);
            }
        })
        const llm=await getSelectedChatModel();
        const suggestions = await generateSuggestions({ chat_history }, llm);
        console.log("Suggestions:",suggestions);
        res.status(200).json({ suggestions });
      } catch (err: any) {
        res
          .status(500)
          .json({ message: `An error has occurred. : ${err.message}` });
        console.log(err.message);
      }
    });

export default suggestionsRouter;