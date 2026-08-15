import { WebSocket } from "ws";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { getChatModel } from "../config";
import { getChatModelProvider } from "../config";
import { getAvailableProviders } from "../modules/ai/model.factory";
import { handleMessage } from "./messageHandler";

export const handleConnection = async (ws: WebSocket) => {
  const models = await getAvailableProviders();
  const provider = getChatModelProvider();  
  const chatModel = getChatModel();

  let llm: BaseChatModel | undefined;
  let embeddings: Embeddings | undefined;

  if (models[provider] && models[provider][chatModel]) {
    llm = models[provider][chatModel] as BaseChatModel | undefined;
    embeddings = models[provider].embeddings as unknown as Embeddings | undefined;
  }

  if (!llm || !embeddings) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Invalid LLM or embeddings model selected",
      })
    );
    return;
  }

  ws.on(
    "message",
    async (message) =>
      await handleMessage(message.toString(), ws, llm, embeddings)
  );
  ws.on("close", () => console.log("Connection Closed"));
};