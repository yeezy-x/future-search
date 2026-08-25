import { Router } from "express";
import {
  getChatModel,
  getChatModelProvider,
  getOllamaApiEndpoint,
} from "../config";

const configRouter = Router();

const providers: Record<string, string[]> = {
  ollama: ["llama3.2", "qwen3-embedding:0.6b"],
  openrouter: ["openrouter/free", "anthropic/claude-3.5-sonnet"],
  gemini: ["gemini-2.5-flash", "gemini-3.7-flash"],
};

configRouter.get("/", (_req, res) => {
  try {
    const selectedProvider = getChatModelProvider();
    const selectedChatModel = getChatModel();

    res.status(200).json({
      providers,
      selectedProvider,
      selectedChatModel,
      ollamaApiUrl: getOllamaApiEndpoint(),
    });
  } catch (err: any) {
    console.error("[CONFIG GET ERROR]", err);
    res.status(500).json({ message: err.message ?? "Failed to load config" });
  }
});

configRouter.post("/", (req, res) => {
  try {
    const { selectedProvider, selectedChatModel, ollamaApiUrl } = req.body;

    if (selectedProvider) {
      if (!providers[selectedProvider]) {
        return res.status(400).json({ message: "Invalid provider" });
      }
      process.env.CHAT_MODEL_PROVIDER = selectedProvider;
    }

    if (selectedChatModel) {
      process.env.CHAT_MODEL = selectedChatModel;
    }

    if (ollamaApiUrl) {
      process.env.OLLAMA_BASE_URL = ollamaApiUrl;
    }
    res.status(200).json({ message: "Config updated for this server session" });
  } catch (err: any) {
    console.error("[CONFIG POST ERROR]", err);
    res.status(500).json({ message: err.message ?? "Failed to save config" });
  }
});

export default configRouter;