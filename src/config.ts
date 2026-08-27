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
