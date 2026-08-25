import { HumanMessage, AIMessage } from "@langchain/core/messages";
import handleVideoSearch from "../agents/videoSearchAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";
import { Router } from "express";

const videosRouter = Router();

videosRouter.post("/", async (req, res) => {
  try {
    let { query, chat_history } = req.body;
    chat_history = chat_history.map((msg: any) => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      }
      if (msg.role === "assistant") {
        return new AIMessage(msg.content);
      }
      return null;
    }).filter(Boolean);
    const llm = await getSelectedChatModel();
    const videos = await handleVideoSearch(
      {
        query,
        chat_history,
      },
      llm
    );
    res.status(200).json({videos});
  } catch (err: any) {
    console.error("[VIDEO ROUTE ERROR]",err);
    res.status(500).json({message: "An error has occurred."});
  }
});

export default videosRouter;