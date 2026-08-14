import {
  getGoogleApiKey,
  getOllamaApiEndpoint,
  getOpenRouterApiKey,
} from "../../config";

import type { AvailableModels } from "./ai.types";

import { createOllamaModel } from "./providers/ollama";
import { createOpenRouterModel } from "./providers/openrouter";
import { createGeminiModel } from "./providers/gemini";

export const getAvailableProviders =
  async (): Promise<AvailableModels> => {
    const models: AvailableModels = {};

    // --------------------------------
    // Ollama
    // --------------------------------

    try {
      const ollamaEndpoint =
        getOllamaApiEndpoint();

      const response = await fetch(
        `${ollamaEndpoint}/api/tags`
      );

      if (!response.ok) {
        throw new Error(
          `Ollama returned ${response.status}`
        );
      }

      const data = (await response.json()) as {
        models?: Array<{
          name: string;
          model: string;
        }>;
      };

      const ollamaModels = data.models ?? [];

      models.ollama = {};

      for (const ollamaModel of ollamaModels) {
        const modelName =
          ollamaModel.name ?? ollamaModel.model;

        models.ollama[modelName] =
          createOllamaModel(
            modelName,  
          );
      }

      if (
        Object.keys(models.ollama).length === 0
      ) {
        delete models.ollama;
      }
    } catch (error) {
      console.error(
        "Error loading Ollama models:",
        error
      );
    }

    // --------------------------------
    // OpenRouter
    // --------------------------------

    try {
      models.openrouter = {};
      models.openrouter[
        "openai/gpt-oss-20b:free"
      ] = createOpenRouterModel(
        "openai/gpt-oss-20b:free"
      );

      models.openrouter[
        "nvidia/nemotron-3-nano-30b-a3b:free"
      ] = createOpenRouterModel(
        "nvidia/nemotron-3-nano-30b-a3b:free",
      );
    } catch (error) {
      console.error(
        "Error loading OpenRouter models:",
        error
      );
    }

    // --------------------------------
    // Gemini
    // --------------------------------

    try {
      models.gemini = {};
      models.gemini["gemini-2.5-flash"] = createGeminiModel("gemini-2.5-flash");
    } catch (error) {
      console.error(
        "Error loading Gemini models:",
        error
      );
    }
    return models;
  };