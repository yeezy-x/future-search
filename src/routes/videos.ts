import express from "express";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import handleVideoSearch from "../agents/videoSearchAgent";
import { getSelectedChatModel } from "../modules/ai/model.selector";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    let { query, chat_history } = req.body;
    chat_history = chat_history.map((msg: any) => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      } else if (msg.rol === "assistant") {
        return new AIMessage(msg.content);
      }
    });
    const llm=await getSelectedChatModel();
    const videos = await handleVideoSearch({ query, chat_history }, llm);
    res.status(200).json({ videos });
  } catch (err:any) {
    res.status(500).json({ message: "An error has occurred." });
    console.log(err.message);
  }
});

export default router;