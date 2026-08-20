import { WebSocket } from "ws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { getChatModel } from "../config";
import { getChatModelProvider } from "../config";
import { getAvailableProviders } from "../modules/ai/model.factory";
import { handleMessage } from "./messageHandler";
import { getEmbeddingModelInstance } from "../modules/ai/embedding.factory";

export const handleConnection = async (ws: WebSocket) => {
  console.log("WebSocket connection established");
  try{
    console.log("[1] ConnectionManager started");
    const models = await getAvailableProviders();
    console.log("[2] Models fetched");
    const provider = getChatModelProvider();
    console.log("[3] Provider fetched");
    const chatModel = getChatModel();
    console.log("[4] Chat model fetched");
    /** Uncomment to log the available providers and models
    console.log("Available providers:");
    
    for (const [providerName, providerModels] of Object.entries(models)) {
      console.log(
        providerName,
        Object.keys(providerModels)
      );
    }
    
    console.log("Selected provider:", provider);
    console.log("Selected chat model:", chatModel);
    */
    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;
  
    if (models[provider] && models[provider][chatModel]) {
      llm = models[provider][chatModel] as BaseChatModel | undefined;
      console.log("[5] LLM fetched");
      try {
        embeddings = getEmbeddingModelInstance();
        console.log("[6] Embeddings fetched");
      } catch (error) {
        console.error(
          "Failed to initialize embeddings:",
          error
        );
        console.log("[7] Failed to initialize embeddings");
      }
    }
  
    if (!llm || !embeddings) {
      console.log("[8] Invalid LLM or embeddings model selected");
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Invalid LLM or embeddings model selected",
        })
      );
      console.log("[9] Error sent");
      ws.close()
      return;
    }
  
    ws.on("message", async (message) =>
    {
      try{
        console.log("[WS] Raw message received:",message.toString());
        await handleMessage(message.toString(), ws, llm, embeddings)
      }catch(error){
        console.error("Failed to handle message:",error);
        console.log("[WS] Failed to handle message"); 
        ws.send(
          JSON.stringify({
            type: "error",
            data: "Failed to handle message",
          })
        );
        ws.close();
      }
    });
    console.log("[10] Message handler attached");
    ws.on("close", () => console.log("Connection Closed"));
    console.log("[11] Connection closed handler attached");
    ws.on("error", (error) => {
      console.error(
        "WebSocket connection error:",
        error
      );
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