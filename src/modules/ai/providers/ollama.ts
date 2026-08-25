import { ChatOllama } from "@langchain/ollama";
import { getOllamaApiEndpoint } from "../../../config";

export function createOllamaModel(
  model: string
) {
  return new ChatOllama({
    model,
    baseUrl:getOllamaApiEndpoint(),
    temperature:0.2,
  });
}