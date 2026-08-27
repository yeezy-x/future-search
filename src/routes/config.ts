import { Router } from "express";
import {
  getOllamaApiEndpoint,
  getSelectedModelId,
  hasGeminiApiKey,
  hasOpenRouterApiKey,
} from "../config";
import {
  FREE_CHAT_MODELS,
  getModelById,
} from "../modules/ai/models.registry";

const configRouter = Router();

const getAvailableModels = () => {
  return FREE_CHAT_MODELS.filter((model) => {
    if (model.provider === "openrouter") return hasOpenRouterApiKey();
    if (model.provider === "gemini") return hasGeminiApiKey();
    return false;
  });
};

configRouter.get("/", (_req, res) => {
  try {
    const models = getAvailableModels();
    const selectedModelId = getSelectedModelId();
    const isSelectedAvailable = models.some((m) => m.id === selectedModelId);

    res.status(200).json({
      models: models.map(({ id, label, description, provider }) => ({
        id,
        label,
        description,
        provider,
      })),
      selectedModelId: isSelectedAvailable
        ? selectedModelId
        : models[0]?.id ?? selectedModelId,
      ollamaApiUrl: getOllamaApiEndpoint(),
    });
  } catch (err: any) {
    console.error("[CONFIG GET ERROR]", err);
    res.status(500).json({ message: err.message ?? "Failed to load config" });
  }
});

configRouter.post("/", (req, res) => {
  try {
    const { selectedModelId, ollamaApiUrl } = req.body;

    if (selectedModelId) {
      const model = getModelById(selectedModelId);
      if (!model) {
        return res.status(400).json({ message: "Invalid model" });
      }

      const available = getAvailableModels();
      if (!available.some((m) => m.id === selectedModelId)) {
        return res.status(400).json({
          message: `Model "${selectedModelId}" is not available. Check API keys.`,
        });
      }

      process.env.SELECTED_MODEL_ID = selectedModelId;
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