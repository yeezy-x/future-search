import { BaseMessage } from "@langchain/core/messages";
import handleVideoSearch from "../agents/videoSearchAgent";
import { Router } from "express";
import { parseChatHistoryFromRequest } from "../utils/parseChatHistoryFromRequest";
import { getChatModelInstance } from "../modules/ai/model.factory";

const videosRouter = Router();

videosRouter.post("/", async (req, res) => {
  try {
    const { query, chat_history } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "query is required" });
    }

    if (!Array.isArray(chat_history)) {
      return res.status(400).json({ message: "chat_history must be an array" });
    }

    const formatted_chat_history: BaseMessage[] =
      parseChatHistoryFromRequest(chat_history);

    if (formatted_chat_history.length === 0) {
      return res.status(400).json({ message: "chat_history must not be empty" });
    }

    const llm = getChatModelInstance();
    const videos = await handleVideoSearch(
      {
        query,
        chat_history: formatted_chat_history,
      },
      llm
    );

    res.status(200).json({ videos });
  } catch (err: unknown) {
    console.error("[VIDEO ROUTE ERROR]", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch videos";
    res.status(500).json({ message, error: message });
  }
});

export default videosRouter;
