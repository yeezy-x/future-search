import "dotenv/config";

export const getSearxngApiEndpoint = (): string => {
  const endpoint = process.env.SEARXNG_URL;

  if (!endpoint) {
    throw new Error("SEARXNG_URL is not defined");
  }

  return endpoint;
};

export const getChatModelProvider = (): string => {
  const provider = process.env.CHAT_MODEL_PROVIDER;

  if (!provider) {
    throw new Error("CHAT_MODEL_PROVIDER is not defined");
  }

  return provider;
};

export const getChatModel = (): string => {
  const model = process.env.CHAT_MODEL;

  if (!model) {
    throw new Error("CHAT_MODEL is not defined");
  }

  return model;
};

export const getOllamaApiEndpoint = (): string => {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
};

export const getOpenRouterApiKey = (): string => {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not defined");
  }

  return key;
};

export const getGoogleApiKey = (): string => {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  return key;
};

export const getEmbeddingProvider = () => {
  const provider = process.env.EMBEDDING_PROVIDER;

  if (!provider) {
    throw new Error(
      "EMBEDDING_PROVIDER is not configured"
    );
  }

  return provider;
};

export const getEmbeddingModel = () => {
  const model = process.env.EMBEDDING_MODEL;

  if (!model) {
    throw new Error(
      "EMBEDDING_MODEL is not configured"
    );
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
