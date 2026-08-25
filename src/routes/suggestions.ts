import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Router } from "express";
import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";
import { parseChatHistoryFromRequest } from "../utils/parseChatHistoryFromRequest";

const suggestionsRouter = Router();

suggestionsRouter.post("/", async (req, res) => {
  try {
    const { chat_history } = req.body;

    if (!Array.isArray(chat_history)) {
      return res.status(400).json({ message: "chat_history must be an array" });
    } 
    const formatted_chat_history: BaseMessage[] = parseChatHistoryFromRequest(chat_history);
    if(formatted_chat_history.length === 0){
      return res.status(400).json({message:"Chat history must not be empty"});
    }

    const llm = await getSelectedChatModel();
    const suggestions = await generateSuggestions(
      { chat_history: formatted_chat_history },
      llm
    );
    res.status(200).json({ suggestions });
  } catch (err: any) {
    console.error("[SUGGESTIONS ERROR]", err);
    res.status(500).json({ message: `An error has occurred: ${err.message}` });
  }
});

export default suggestionsRouter;