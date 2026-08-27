import { WebSocket } from "ws";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { handleMessage } from "./messageHandler";
import { getChatModelInstance } from "../modules/ai/model.factory";

export const handleConnection = async (ws: WebSocket) => {
  console.log("WebSocket connection established");
  try {
    const llm = getChatModelInstance();

    if (!llm) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Invalid LLM model selected",
        })
      );
      ws.close();
      return;
    }

    ws.on("message", async (message) => {
      try {
        await handleMessage(message.toString(), ws, llm);
      } catch (error) {
        console.error("Failed to handle message:", error);
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
      console.error("WebSocket connection error:", error);
    });
  } catch (error) {
    console.error("Failed to initialize WebSocket connection:", error);
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
