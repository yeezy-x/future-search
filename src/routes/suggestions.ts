import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { Router } from "express";
import generateSuggestions from "../agents/suggestionGeneratorAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";

const suggestionsRouter = Router();

suggestionsRouter.post("/suggest", async (req, res) => {
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

    console.log(
      "Formatted chat history:",
      formattedChatHistory
    );

    const llm = await getSelectedChatModel();

    const suggestions = await generateSuggestions(
      {
        chat_history: formattedChatHistory,
      },
      llm
    );

    console.log(
      "Suggestions:",
      suggestions
    );

    res.status(200).json({
      suggestions,
    });

  } catch (err: any) {
    console.error(
      "[SUGGESTIONS ERROR]",
      err
    );

    res.status(500).json({
      message: `An error has occurred: ${err.message}`,
    });
  }
});

export default suggestionsRouter;