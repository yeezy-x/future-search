import { OllamaEmbeddings } from "@langchain/ollama";
import {getEmbeddingModel,getEmbeddingProvider,getOllamaApiEndpoint} from "../../config";

export const getEmbeddingModelInstance = () => {
  const provider = getEmbeddingProvider();
  const model = getEmbeddingModel();

  if (provider === "ollama") {
    return new OllamaEmbeddings({
      baseUrl: getOllamaApiEndpoint(),
      model,
    });
  }

  throw new Error(
    `Unsupported embedding provider: ${provider}`
  );
};