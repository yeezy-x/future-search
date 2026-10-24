import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import handleWebSearch from "../agents/webSearchAgent";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import handleAcademicSearch from "../agents/academicSearchAgent";
import handleWritingAssistant from "../agents/writingAssistant";
import handleYoutubeSearch from "../agents/youtubeSearchAgent";
import handleRedditSearch from "../agents/redditSearchAgent";
import { SystemMessage } from "langchain";
import { emit } from "cluster";

type Role = "human" | "ai" | "system";

const isRole = (value: unknown): value is Role =>
  value === "human" || value === "ai" || value === "system";

const isHistory = (value: unknown): value is Array<[Role, string]> =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      isRole(entry[0]) &&
      typeof entry[1] === "string"
  );

type Message = {
  type: string;
  content: string;
  copilot: string;
  focusMode: keyof typeof searchHandlers;
  history: Array<[Role, string]>;
};

type SearchHandler = (
  input: { query: string; chat_history: BaseMessage[] },
  llm: BaseChatModel,
  emitter: EventEmitter
) => void;

const searchHandlers: Record<string, SearchHandler> = {
  webSearch: handleWebSearch,
  academicSearch: handleAcademicSearch,
  writingAssistant: handleWritingAssistant,
  youtubeSearch: handleYoutubeSearch,
  redditSearch: handleRedditSearch,
};

const handleEmitterEvents = (emitter: EventEmitter,ws: WebSocket,id: string) => {
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

export const handleMessage = async (message: string,ws: WebSocket,llm: BaseChatModel) => {
  try {
    const parsedMessage = JSON.parse(message) as Message;
    const id = crypto.randomUUID();
    const content = typeof parsedMessage.content === "string" ? parsedMessage.content.trim() : "";
    if (!content || !isHistory(parsedMessage.history)) {
      ws.send(JSON.stringify({ type: "error", data: "Invalid message format" }));
      return;
    }
    const history: BaseMessage[] = parsedMessage.history.map(([role, text]) => {
      if (role === "human") return new HumanMessage({ content: text });
      if (role === "ai") return new AIMessage({ content: text });
      return new SystemMessage({ content: text });
    });
    
    if (parsedMessage.type === "message") {
      const handler = searchHandlers[parsedMessage.focusMode];
      if(!handler){
        ws.send(JSON.stringify({ type: "error", data: "Invalid focus mode" }));
        return;
      }
      const emitter = new EventEmitter();
      handleEmitterEvents(emitter, ws, id);
      try {
        handler(
          {
            query: content,
            chat_history: history,
          },
          llm,
          emitter
        );
      } catch (error) {
        console.error(`[${parsedMessage.focusMode} ERROR]`, error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: `An error has occurred please try again later: ${error}`,
          })
        );
      }
    }
  } catch (error) {
    console.error("Failed to handle message", error);
    ws.send(
      JSON.stringify({ type: "error", data: `An error has occurred please try again later: ${error}` })
    );
  }
};
