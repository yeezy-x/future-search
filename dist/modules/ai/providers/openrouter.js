"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenRouterModel = createOpenRouterModel;
const openai_1 = require("@langchain/openai");
function createOpenRouterModel(model) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not defined");
    }
    return new openai_1.ChatOpenAI({
        model,
        apiKey,
        temperature: 0.2,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}
