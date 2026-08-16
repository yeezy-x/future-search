import { BaseMessage } from "langchain";

export const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history.map(
        (message) =>
        `${message._getType()}: ${message.content}`
    ).join("\n");
};