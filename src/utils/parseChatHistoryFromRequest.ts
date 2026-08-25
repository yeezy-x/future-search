import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

export const parseChatHistoryFromRequest = (chat_history: unknown): BaseMessage[] => {
  if (!Array.isArray(chat_history)) return [];

  return chat_history.flatMap((msg: any): BaseMessage[] => {
    if (msg?.role === "user") return [new HumanMessage(msg.content)];
    if (msg?.role === "assistant") return [new AIMessage(msg.content)];
    return [];
  });
};