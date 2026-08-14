import {getChatModel,getChatModelProvider} from "../../config";
import type { ChatModel } from "./ai.types";
import { getAvailableProviders } from "./model.factory";

export const getSelectedChatModel = async (): Promise<ChatModel> => {
    const models = await getAvailableProviders();
    const provider = getChatModelProvider();
    const model = getChatModel();
    const providerModels = models[provider];
    if (!providerModels) {
        throw new Error(`AI provider "${provider}" is not available`);
    }
    const chatModel = providerModels[model];
    if (!chatModel) {
        throw new Error(`AI model "${model}" is not available for provider "${provider}"`);
    }
    return chatModel;
};