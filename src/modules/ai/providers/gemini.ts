import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createGeminiModel(
  model: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
  }
  return new ChatGoogleGenerativeAI({
    model,
    apiKey,
    temperature:0.2,
  });
}