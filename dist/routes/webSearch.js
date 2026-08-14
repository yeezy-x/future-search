"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webSearchRouter = (0, express_1.Router)();
webSearchRouter.post("/search", async (req, res) => {
    try {
        console.log("web search request received:", req.body);
    }
    catch (error) {
        console.error("web search request error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = webSearchRouter;
