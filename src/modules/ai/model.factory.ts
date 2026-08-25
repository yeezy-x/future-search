import {getChatModel, getChatModelProvider, getOllamaApiEndpoint} from "../../config";
import { createOllamaModel } from "./providers/ollama";
import { createOpenRouterModel } from "./providers/openrouter";
import { createGeminiModel } from "./providers/gemini";
import { ChatModel } from "./ai.types";

export const getChatModelInstance = (): ChatModel => {
  const provider = getChatModelProvider();
  const model = getChatModel();
  if (provider === "ollama") {
    return createOllamaModel(model);
  }
  if (provider === "openrouter") {
    return createOpenRouterModel(model);
  }
  if (provider === "gemini") {
    return createGeminiModel(model);
  }
  throw new Error(`Unsupported chat model provider: ${provider}`);
};