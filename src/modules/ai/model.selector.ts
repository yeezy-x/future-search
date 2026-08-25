import type { ChatModel } from "./ai.types";
import { getChatModelInstance } from "./model.factory";

export const getSelectedChatModel = (): ChatModel => {
  return getChatModelInstance();
};