"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOllamaModel = createOllamaModel;
const ollama_1 = require("@langchain/ollama");
function createOllamaModel(model) {
    return new ollama_1.ChatOllama({
        model,
        baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
        temperature: 0.2,
    });
}
