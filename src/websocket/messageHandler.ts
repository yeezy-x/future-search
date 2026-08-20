import { WebSocket, EventEmitter } from "ws";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import handleWebSearch from "../agents/webSearchAgent";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import handleAcademicSearch from "../agents/academicSearchAgent";
import handleWritingAssistant from "../agents/writingAssistant";
import handleYoutubeSearch from "../agents/youtubeSearchAgent";
import handleRedditSearch from "../agents/redditSearchAgent";

type Message = {
  type: string;
  content: string;
  copilot: string;
  focusMode: keyof typeof searchHandlers;
  history: Array<[string, string]>;
};

const searchHandlers = {
  webSearch: handleWebSearch,
  academicSearch: handleAcademicSearch,
  writingAssistant: handleWritingAssistant,
  youtubeSearch: handleYoutubeSearch,
  redditSearch: handleRedditSearch,
}

const handleEmitterEvents = (
  emitter: EventEmitter,
  ws: WebSocket,
  id: string
) => {
  emitter.on("data", (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData.type === "response") {
      ws.send(
        JSON.stringify({
          type: "message",
          data: parsedData.data,
          messageId: id,
        })
      );
    } else if (parsedData.type === "sources") {
      ws.send(
        JSON.stringify({
          type: "sources",
          data: parsedData.data,
          messageId: id,
        })
      );
    }
  });
  emitter.on("end", () => {
    ws.send(JSON.stringify({ type: "messageEnd", messageId: id }));
  });
  emitter.on("error", (data) => {
    const parsedData = JSON.parse(data);
    ws.send(JSON.stringify({ type: "error", data: parsedData.data }));
  });
};

export const handleMessage = async (
  message: string,
  ws: WebSocket,
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  try {
    console.log("[1] Message received");
    const parsedMessage = JSON.parse(message) as Message;
    console.log("[2] Parsed message:", parsedMessage);
    const id = Math.random().toString(36).substring(7);
    if (!parsedMessage.content) {
      return ws.send(
        JSON.stringify({ type: "error", data: "Invalid message format" })
      );
    }
    const history: BaseMessage[] = parsedMessage.history.map((msg:any) => {
      if (msg[0] === "human") {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });
    console.log("[3] History Created:", history);
    if (parsedMessage.type === "message") {
      console.log("[4] Message type confirmed")
      const handler = searchHandlers[parsedMessage.focusMode as keyof typeof searchHandlers];
      console.log("[5] Handler:", !!handler);
      if (handler) {
        try {
          console.log("[6] Calling WebSearchAgent");
        
          const emitter = await handler(
            {
              query: parsedMessage.content,
              chat_history: history,
            },
            llm,
            embeddings
          );
        
          console.log("[7] WebSearchAgent returned");
        
          handleEmitterEvents(
            emitter as EventEmitter,
            ws,
            id
          );
        
          console.log("[8] Event listeners attached");
        } catch (error) {
          console.error(
            "[WebSearchAgent ERROR]",
            error
          );
        
          ws.send(
            JSON.stringify({
              type: "error",
              data: "Web search failed",
            })
          );
        }
      } else {
        ws.send(JSON.stringify({ type: "error", data: "Invalid focus mode" }));
      }
    }
  } catch (error) {
    console.error("Failed to handle message", error);
    ws.send(JSON.stringify({ type: "error", data: "Invalid message format" }));
  }
};