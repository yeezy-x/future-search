import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { Router } from "express";
import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";

const suggestionsRouter = Router();

suggestionsRouter.post("/", async (req, res) => {
  try {
    const { chat_history } = req.body;

    const formattedChatHistory = chat_history.map(
      (msg: any) => {
        if (msg.role === "user") {
          return new HumanMessage(msg.content);
        } else {
          return new AIMessage(msg.content);
        }
      }
    );
    const llm = await getSelectedChatModel();
    const suggestions = await generateSuggestions(
      {
        chat_history: formattedChatHistory,
      },
      llm
    );
    res.status(200).json({
      suggestions,
    });
  } catch (err: any) {
    console.error("[SUGGESTIONS ERROR]",err);
    res.status(500).json({message: `An error has occurred: ${err.message}`});
  }
});

export default suggestionsRouter;