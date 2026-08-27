"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiModel = createGeminiModel;
const google_genai_1 = require("@langchain/google-genai");
const config_1 = require("../../../config");
function createGeminiModel(model) {
    const apiKey = (0, config_1.getGoogleApiKey)();
    return new google_genai_1.ChatGoogleGenerativeAI({
        model,
        apiKey,
        temperature: 0.2,
    });
}
