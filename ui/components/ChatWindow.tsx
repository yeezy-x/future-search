"use client";

import { Document } from "@langchain//core/documents";
import { useEffect, useRef, useState } from "react";
import EmptyChat from "./EmptyChat";
import Chat from "./Chat";
import Navbar from "./Navbar";
import { getSuggestions } from "@/lib/actions";

export type Message = {
  id: string;
  createdAt: Date;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Document[];
};

const useSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setWs(socket);
      setIsConnected(true);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    return () => socket.close();
  }, [url]);

  return { ws, isConnected };
};

const ChatWindow = () => {
  const { ws, isConnected } = useSocket(process.env.NEXT_PUBLIC_WS_URL!);
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);
  const [focusMode, setFocusMode] = useState("webSearch");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (loading) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    setLoading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let receivedMessage = "";
    let added = false;

    ws.send(
      JSON.stringify({
        type: "message",
        content: message,
        focusMode: focusMode,
        history: [...chatHistory, ["human", message]],
      })
    );

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        id: Math.random().toString(36).substring(7),
        role: "user",
        createdAt: new Date(),
      },
    ]);

    const messageHandler = async (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      if (data.type === "sources") {
        sources = data.data;

        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: "",
              id: data.messageId,
              role: "assistant",
              sources: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessageAppeared(true);
      }

      if (data.type === "message") {
        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: data.data,
              id: data.messageId,
              role: "assistant",
              sources: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id === data.messageId) {
              return { ...message, content: message.content + data.data };
            }
            return message;
          })
        );

        receivedMessage += data.data;
        setMessageAppeared(true);
      }

      if (data.type === "messageEnd") {
        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", message],
          ["assistant", receivedMessage],
        ]);
        ws?.removeEventListener("message", messageHandler);
        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        if (lastMsg.role === "assistant" && !lastMsg.suggestions) {
          const suggestions = await getSuggestions(messagesRef.current);
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === lastMsg.id) {
                return { ...msg, suggestions: suggestions };
              }
              return msg;
            })
          );
        }
      }

      if (data.type === "error") {
        ws?.removeEventListener("message", messageHandler);
        setLoading(false);
        setMessageAppeared(true);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (added && last?.role === "assistant") {
            return prev.map((msg, i) =>
              i === prev.length - 1
                ? { ...msg, content: msg.content || data.data }
                : msg
            );
          }

          return [
            ...prev,
            {
              content: data.data,
              id: Math.random().toString(36).substring(7),
              role: "assistant",
              createdAt: new Date(),
            },
          ];
        });
      }
    };

    ws?.addEventListener("message", messageHandler);
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.id === messageId);

    if (index === -1) return;

    const message = messages[index - 1];

    setMessages((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    setChatHistory((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    sendMessage(message.content);
  };

  return (
    <div>
      {messages.length > 0 ? (
        <>
          <Navbar messages={messages} />
          <Chat
            loading={loading}
            isConnected={isConnected}
            messages={messages}
            sendMessage={sendMessage}
            messageAppeared={messageAppeared}
            rewrite={rewrite}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
          />
        </>
      ) : (
        <EmptyChat
          sendMessage={sendMessage}
          isConnected={isConnected}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        />
      )}
    </div>
  );
};

export default ChatWindow;