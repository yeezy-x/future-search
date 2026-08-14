import { Router } from "express";

const webSearchRouter=Router();

webSearchRouter.post("/search",async (req,res)=>{
    try{
        console.log("web search request received:",req.body);
    }catch(error){
        console.error("web search request error:",error);
        res.status(500).json({error:"Internal server error"});
    }
});

export default webSearchRouter;