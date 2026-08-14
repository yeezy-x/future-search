"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableProviders = void 0;
const config_1 = require("../../config");
const ollama_1 = require("./providers/ollama");
const openrouter_1 = require("./providers/openrouter");
const gemini_1 = require("./providers/gemini");
const getAvailableProviders = async () => {
    const models = {};
    // --------------------------------
    // Ollama
    // --------------------------------
    try {
        const ollamaEndpoint = (0, config_1.getOllamaApiEndpoint)();
        const response = await fetch(`${ollamaEndpoint}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
        }
        const data = (await response.json());
        const ollamaModels = data.models ?? [];
        models.ollama = {};
        for (const ollamaModel of ollamaModels) {
            const modelName = ollamaModel.name ?? ollamaModel.model;
            models.ollama[modelName] =
                (0, ollama_1.createOllamaModel)(modelName);
        }
        if (Object.keys(models.ollama).length === 0) {
            delete models.ollama;
        }
    }
    catch (error) {
        console.error("Error loading Ollama models:", error);
    }
    // --------------------------------
    // OpenRouter
    // --------------------------------
    try {
        models.openrouter = {};
        models.openrouter["openai/gpt-oss-20b:free"] = (0, openrouter_1.createOpenRouterModel)("openai/gpt-oss-20b:free");
        models.openrouter["nvidia/nemotron-3-nano-30b-a3b:free"] = (0, openrouter_1.createOpenRouterModel)("nvidia/nemotron-3-nano-30b-a3b:free");
    }
    catch (error) {
        console.error("Error loading OpenRouter models:", error);
    }
    // --------------------------------
    // Gemini
    // --------------------------------
    try {
        models.gemini = {};
        models.gemini["gemini-2.5-flash"] = (0, gemini_1.createGeminiModel)("gemini-2.5-flash");
    }
    catch (error) {
        console.error("Error loading Gemini models:", error);
    }
    return models;
};
exports.getAvailableProviders = getAvailableProviders;
