import "dotenv/config";
import { DEFAULT_MODEL_ID } from "./modules/ai/models.registry";

export const getSearxngApiEndpoint = (): string => {
  const endpoint = process.env.SEARXNG_URL;
  if (!endpoint) {
    throw new Error("SEARXNG_URL is not defined");
  }
  return endpoint;
};

export const getSelectedModelId = (): string => {
  return process.env.SELECTED_MODEL_ID ?? DEFAULT_MODEL_ID;
};

export const getOllamaApiEndpoint = (): string => {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
};

export const getOpenRouterApiKey = (): string | undefined => {
  return process.env.OPENROUTER_API_KEY;
};

export const getGoogleApiKey = (): string | undefined => {
  return process.env.GEMINI_API_KEY;
};

export const hasOpenRouterApiKey = (): boolean =>
  Boolean(getOpenRouterApiKey());

export const hasGeminiApiKey = (): boolean =>
  Boolean(getGoogleApiKey());

export const getEmbeddingProvider = (): string => {
  const provider = process.env.EMBEDDING_PROVIDER;
  if (!provider) {
    throw new Error("EMBEDDING_PROVIDER is not configured");
  }
  return provider;
};

export const getEmbeddingModel = (): string => {
  const model = process.env.EMBEDDING_MODEL;
  if (!model) {
    throw new Error("EMBEDDING_MODEL is not configured");
  }
  return model;
};

export const getSimilarityMeasure = (): string => {
  const measure = process.env.SIMILARITY_MEASURE;
  if (!measure) {
    throw new Error("SIMILARITY_MEASURE is not defined");
  }
  return measure;
};