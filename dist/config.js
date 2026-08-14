"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleApiKey = exports.getOpenRouterApiKey = exports.getOllamaApiEndpoint = exports.getChatModel = exports.getChatModelProvider = exports.getSearxngApiEndpoint = void 0;
require("dotenv/config");
const getSearxngApiEndpoint = () => {
    const endpoint = process.env.SEARXNG_URL;
    if (!endpoint) {
        throw new Error("SEARXNG_URL is not defined");
    }
    return endpoint;
};
exports.getSearxngApiEndpoint = getSearxngApiEndpoint;
const getChatModelProvider = () => {
    const provider = process.env.CHAT_MODEL_PROVIDER;
    if (!provider) {
        throw new Error("CHAT_MODEL_PROVIDER is not defined");
    }
    return provider;
};
exports.getChatModelProvider = getChatModelProvider;
const getChatModel = () => {
    const model = process.env.CHAT_MODEL;
    if (!model) {
        throw new Error("CHAT_MODEL is not defined");
    }
    return model;
};
exports.getChatModel = getChatModel;
const getOllamaApiEndpoint = () => {
    return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
};
exports.getOllamaApiEndpoint = getOllamaApiEndpoint;
const getOpenRouterApiKey = () => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
        throw new Error("OPENROUTER_API_KEY is not defined");
    }
    return key;
};
exports.getOpenRouterApiKey = getOpenRouterApiKey;
const getGoogleApiKey = () => {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
        throw new Error("GOOGLE_API_KEY is not defined");
    }
    return key;
};
exports.getGoogleApiKey = getGoogleApiKey;
