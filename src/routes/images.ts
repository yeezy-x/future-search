import { Router } from "express";
import handleImageSearch from "../agents/imageSearchAgent";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { getSelectedChatModel } from "../modules/ai/model.selector";
import { parseChatHistoryFromRequest } from "../utils/parseChatHistoryFromRequest";

const imagesRouter = Router();

imagesRouter.post("/", async (req, res) => {
  try {
    const { query, chat_history } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "query is required" });
    }

    if (!Array.isArray(chat_history)) {
      return res.status(400).json({ message: "chat_history must be an array" });
    }

    const formatted_chat_history: BaseMessage[] = parseChatHistoryFromRequest(chat_history);

    if(formatted_chat_history.length === 0){
      return res.status(400).json({message:"Chat history must not be empty"});
    }

    const llm = await getSelectedChatModel();
    const images = await handleImageSearch(
      { chat_history: formatted_chat_history, query },
      llm
    );
    res.status(200).json({ images });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default imagesRouter;