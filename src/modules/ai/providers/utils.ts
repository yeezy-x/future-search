import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export const getChatModelProvider = (models: Record<string, BaseChatModel>) => {
    const provider = process.env.CHAT_MODEL_PROVIDER!;
    if (!models[provider]) {
        throw new Error(`Chat model provider ${provider} not found`);
    }
    return models[provider];
}