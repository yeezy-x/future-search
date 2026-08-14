import { ChatOllama } from "@langchain/ollama";

export function createOllamaModel(
  model: string
) {
  return new ChatOllama({
    model,
    baseUrl:process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    temperature:0.2,
  });
}