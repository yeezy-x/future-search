import { ChatOpenAI } from "@langchain/openai";

export function createOpenRouterModel(
  model: string
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not defined"
    );
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