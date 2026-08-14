"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiModel = createGeminiModel;
const google_genai_1 = require("@langchain/google-genai");
function createGeminiModel(model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
    }
    return new google_genai_1.ChatGoogleGenerativeAI({
        model,
        apiKey,
        temperature: 0.2,
    });
}
