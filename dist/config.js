"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasGeminiApiKey = exports.hasOpenRouterApiKey = exports.getGoogleApiKey = exports.getOpenRouterApiKey = exports.getSelectedModelId = exports.getSearxngApiEndpoint = void 0;
require("dotenv/config");
const models_registry_1 = require("./modules/ai/models.registry");
const getSearxngApiEndpoint = () => {
    const endpoint = process.env.SEARXNG_URL;
    if (!endpoint) {
        throw new Error("SEARXNG_URL is not defined");
    }
    return endpoint;
};
exports.getSearxngApiEndpoint = getSearxngApiEndpoint;
const getSelectedModelId = () => {
    return process.env.SELECTED_MODEL_ID ?? models_registry_1.DEFAULT_MODEL_ID;
};
exports.getSelectedModelId = getSelectedModelId;
const getOpenRouterApiKey = () => {
    return process.env.OPENROUTER_API_KEY;
};
exports.getOpenRouterApiKey = getOpenRouterApiKey;
const getGoogleApiKey = () => {
    return process.env.GEMINI_API_KEY;
};
exports.getGoogleApiKey = getGoogleApiKey;
const hasOpenRouterApiKey = () => Boolean((0, exports.getOpenRouterApiKey)());
exports.hasOpenRouterApiKey = hasOpenRouterApiKey;
const hasGeminiApiKey = () => Boolean((0, exports.getGoogleApiKey)());
exports.hasGeminiApiKey = hasGeminiApiKey;
