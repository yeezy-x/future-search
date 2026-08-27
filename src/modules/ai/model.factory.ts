import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getSelectedModelId } from "../../config";
import { getModelById } from "./models.registry";
import { createOpenRouterModel } from "./providers/openrouter";
import { createGeminiModel } from "./providers/gemini";

export const getChatModelInstance = (): BaseChatModel => {
  const modelId = getSelectedModelId();
  const option = getModelById(modelId);

  if (!option) {
    throw new Error(`Unknown model id: ${modelId}`);
  }

  switch (option.provider) {
    case "openrouter":
      return createOpenRouterModel(option.model);
    case "gemini":
      return createGeminiModel(option.model);
    default:
      throw new Error(`Unsupported provider: ${option.provider}`);
  }
};