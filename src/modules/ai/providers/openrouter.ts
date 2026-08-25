import { ChatOpenAI } from "@langchain/openai";
import { getOpenRouterApiKey } from "../../../config";

export function createOpenRouterModel(
  model: string
) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined");
  }

  return new ChatOpenAI({
    model,
    apiKey,
    temperature:0.2,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}