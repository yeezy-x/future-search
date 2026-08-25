import { WebSocket } from "ws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { getChatModel } from "../config";
import { getChatModelProvider } from "../config";
import { handleMessage } from "./messageHandler";
import { getEmbeddingModelInstance } from "../modules/ai/embedding.factory";
import { getSelectedChatModel } from "../modules/ai/model.selector";

export const handleConnection = async (ws: WebSocket) => {
  console.log("WebSocket connection established");
  try{
    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;
  
    llm = getSelectedChatModel();
    embeddings = getEmbeddingModelInstance();
  
    if (!llm || !embeddings) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Invalid LLM or embeddings model selected",
        })
      );
      ws.close()
      return;
    }
  
    ws.on("message", async (message) =>
    {
      try{
        await handleMessage(message.toString(), ws, llm, embeddings)
      }catch(error){
        console.error("Failed to handle message:",error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: "Failed to handle message",
          })
        );
        ws.close();
      }
    });
    ws.on("close", () => console.log("Connection Closed"));
    ws.on("error", (error) => {
      console.error("WebSocket connection error:",error);
    });
  }catch(error){
    console.error(
      "Failed to initialize WebSocket connection:",
      error
    );
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Failed to initialize AI models",
        })
      );
    }

    ws.close();    
  }
};