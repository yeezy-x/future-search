import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type AIProvider = "ollama" | "openrouter" | "gemini";

export interface ModelConfig {
  provider: AIProvider;
  model: string;
}

export type ChatModel = BaseChatModel;

export type AvailableModels=Record<string, Record<string,BaseChatModel>>