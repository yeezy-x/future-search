"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imageSearchAgent_1 = __importDefault(require("../agents/imageSearchAgent"));
const messages_1 = require("@langchain/core/messages");
const model_selector_1 = require("../modules/ai/model.selector");
const imagesRouter = (0, express_1.Router)();
imagesRouter.post("/search", async (req, res) => {
    try {
        let { query, chat_history = [] } = req.body;
        const formatted_chat_history = chat_history.map((msg) => {
            if (msg.role === "user") {
                return new messages_1.HumanMessage(msg.content);
            }
            else {
                return new messages_1.AIMessage(msg.content);
            }
        });
        const llm = await (0, model_selector_1.getSelectedChatModel)();
        const images = await (0, imageSearchAgent_1.default)({ chat_history: formatted_chat_history, query }, llm);
        res.json(images);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = imagesRouter;
