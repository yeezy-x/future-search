import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getGoogleApiKey } from "../../../config";

export function createGeminiModel(model: string) {
  const apiKey = getGoogleApiKey();
  return new ChatGoogleGenerativeAI({
    model,
    apiKey,
    temperature:0.2,
  });
}