"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatModelProvider = void 0;
const getChatModelProvider = (models) => {
    const provider = process.env.CHAT_MODEL_PROVIDER;
    if (!models[provider]) {
        throw new Error(`Chat model provider ${provider} not found`);
    }
    return models[provider];
};
exports.getChatModelProvider = getChatModelProvider;
