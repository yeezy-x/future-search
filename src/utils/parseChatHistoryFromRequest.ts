import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

export const parseChatHistoryFromRequest = (chat_history: BaseMessage[]): BaseMessage[] => {
  if (!Array.isArray(chat_history)) return [];

  return chat_history.flatMap((msg: any): BaseMessage[] => {
    if (msg?.role === "user") return [new HumanMessage(msg.content)];
    if (msg?.role === "ai") return [new AIMessage(msg.content)];
    return []
  });
};