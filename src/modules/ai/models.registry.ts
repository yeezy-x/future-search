export type ChatProvider = "openrouter" | "gemini";

export type ModelOption = {
  id: string;
  label: string;
  provider: ChatProvider;
  model: string;
  description?: string;
};

export const FREE_CHAT_MODELS: ModelOption[] = [
  {
    id: "openrouter-auto-free",
    label: "OpenRouter Free (auto)",
    provider: "openrouter",
    model: "openrouter/free",
    description: "Picks the best free model automatically",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    description: "Google free tier — fast and reliable",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    description: "Lighter Google free tier model",
  },
  {
    id: "llama-3.2-3b-free",
    label: "Llama 3.2 3B",
    provider: "openrouter",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    description: "Meta's small free model via OpenRouter",
  },
  {
    id: "qwen-free",
    label: "Qwen 3 4B",
    provider: "openrouter",
    model: "qwen/qwen3-4b:free",
    description: "Alibaba Qwen free model via OpenRouter",
  },
  {
    id: "glm-5.2-free",
    label: "GLM 5.2",
    provider: "openrouter",
    model: "z-ai/glm-5.2:free",
    description: "Z.ai GLM free model via OpenRouter",
  },
];

export const DEFAULT_MODEL_ID = "openrouter-auto-free";

export const getModelById = (id: string): ModelOption | undefined =>
  FREE_CHAT_MODELS.find((m) => m.id === id);