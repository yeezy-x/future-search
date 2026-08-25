import { Router } from "express";
import handleImageSearch from "../agents/imageSearchAgent";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { getSelectedChatModel } from "../modules/ai/model.selector";

const imagesRouter=Router();

imagesRouter.post("/",async (req,res)=>{
    try{
        let {query, chat_history}=req.body;
        const formatted_chat_history=chat_history.map((msg:any)=>{
            if(msg.role==="user"){
                return new HumanMessage(msg.content);
            }else{
                return new AIMessage(msg.content);
            }
        })
        const llm=await getSelectedChatModel();
        const images=await handleImageSearch(
            {chat_history:formatted_chat_history,query},
            llm
        );
        res.status(200).json({images});
    }catch(error){
        console.error(error);
        res.status(500).json({error:"Internal server error"});
    }
});

export default imagesRouter;
