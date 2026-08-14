"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectedChatModel = void 0;
const config_1 = require("../../config");
const model_factory_1 = require("./model.factory");
const getSelectedChatModel = async () => {
    const models = await (0, model_factory_1.getAvailableProviders)();
    const provider = (0, config_1.getChatModelProvider)();
    const model = (0, config_1.getChatModel)();
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
exports.getSelectedChatModel = getSelectedChatModel;
