"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imageSearchAgent_1 = __importDefault(require("../agents/imageSearchAgent"));
const messages_1 = require("@langchain/core/messages");
const parseChatHistoryFromRequest_1 = require("../utils/parseChatHistoryFromRequest");
const model_factory_1 = require("../modules/ai/model.factory");
const imagesRouter = (0, express_1.Router)();
imagesRouter.post("/", async (req, res) => {
    try {
        const { query, chat_history } = req.body;
        if (!query || typeof query !== "string") {
            return res.status(400).json({ message: "query is required" });
        }
        if (!Array.isArray(chat_history)) {
            return res.status(400).json({ message: "chat_history must be an array" });
        }
        const formatted_chat_history = (0, parseChatHistoryFromRequest_1.parseChatHistoryFromRequest)(chat_history);
        const history = formatted_chat_history.length > 0 ? formatted_chat_history : [new messages_1.HumanMessage(query)];
        const llm = (0, model_factory_1.getChatModelInstance)();
        const images = await (0, imageSearchAgent_1.default)({ chat_history: history, query }, llm);
        res.status(200).json({ images });
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : "Unknown error");
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.default = imagesRouter;
