"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatModelInstance = void 0;
const config_1 = require("../../config");
const models_registry_1 = require("./models.registry");
const openrouter_1 = require("./providers/openrouter");
const gemini_1 = require("./providers/gemini");
const getChatModelInstance = () => {
    const modelId = (0, config_1.getSelectedModelId)();
    const option = (0, models_registry_1.getModelById)(modelId);
    if (!option) {
        throw new Error(`Unknown model id: ${modelId}`);
    }
    switch (option.provider) {
        case "openrouter":
            return (0, openrouter_1.createOpenRouterModel)(option.model);
        case "gemini":
            return (0, gemini_1.createGeminiModel)(option.model);
        default:
            throw new Error(`Unsupported provider: ${option.provider}`);
    }
};
exports.getChatModelInstance = getChatModelInstance;
