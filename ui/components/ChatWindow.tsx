"use client";

import { Document } from "@langchain/core/documents";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import EmptyChat from "./EmptyChat";
import Chat from "./Chat";
import Navbar from "./Navbar";
import { getSuggestions } from "@/lib/actions";
import { useAppShell } from "@/context/AppShellContext";
import {
  deriveTitle,
  documentsToStored,
  loadSessions,
  storedToDocuments,
  StoredMessage,
} from "@/lib/chatSessions";

export type Message = {
  id: string;
  createdAt: Date;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Document[];
};

const toMessage = (stored: StoredMessage): Message => ({
  id: stored.id,
  createdAt: new Date(stored.createdAt),
  content: stored.content,
  role: stored.role,
  suggestions: stored.suggestions,
  sources: storedToDocuments(stored.sources),
});

const toStored = (message: Message): StoredMessage => ({
  id: message.id,
  createdAt: message.createdAt.toISOString(),
  content: message.content,
  role: message.role,
  suggestions: message.suggestions,
  sources: documentsToStored(message.sources),
});

const useSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        setWs(socket);
        setIsConnected(true);
      };

      socket.onclose = () => {
        setIsConnected(false);
        setWs(null);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [url]);

  return { ws, isConnected };
};

const ChatWindow = ({ sessionId }: { sessionId?: string }) => {
  const router = useRouter();
  const { createSession, updateSession, deleteSession } = useAppShell();
  const { ws, isConnected } = useSocket(process.env.NEXT_PUBLIC_WS_URL!);

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    sessionId
  );
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);
  const [focusMode, setFocusMode] = useState("webSearch");
  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("New chat");
  const [hydrated, setHydrated] = useState(!sessionId);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;

    const session = loadSessions().find((s) => s.id === sessionId);
    if (!session) {
      router.replace("/");
      return;
    }

    queueMicrotask(() => {
      setActiveSessionId(sessionId);
      setMessages(session.messages.map(toMessage));
      setChatHistory(session.chatHistory);
      setFocusMode(session.focusMode);
      setCopilotEnabled(session.copilotEnabled);
      setSessionTitle(session.title);
      setHydrated(true);
    });
  }, [sessionId, router]);

  const persistSession = useCallback(
    (id: string) => {
      const storedMessages = messagesRef.current.map(toStored);
      const firstUser = storedMessages.find((m) => m.role === "user");
      const title =
        firstUser?.content ? deriveTitle(firstUser.content) : "New chat";

      updateSession(id, {
        messages: storedMessages,
        chatHistory,
        focusMode,
        copilotEnabled,
        title,
      });
      setSessionTitle(title);
    },
    [chatHistory, focusMode, copilotEnabled, updateSession]
  );

  useEffect(() => {
    if (!activeSessionId || !hydrated || loading) return;
    persistSession(activeSessionId);
  }, [
    messages,
    chatHistory,
    focusMode,
    copilotEnabled,
    activeSessionId,
    hydrated,
    loading,
    persistSession,
  ]);

  const clearChat = () => {
    if (loading) return;
    if (activeSessionId) {
      deleteSession(activeSessionId);
      router.push("/");
      return;
    }
    setMessages([]);
    setChatHistory([]);
    setSessionTitle("New chat");
    document.title = "Future Search - Chat with the internet";
  };

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let currentSessionId = activeSessionId;

    if (!currentSessionId) {
      const session = createSession();
      currentSessionId = session.id;
      setActiveSessionId(session.id);
      router.replace(`/c/${session.id}`);
    }

    setLoading(true);
    setMessageAppeared(false);

    if (messages.length === 0) {
      const title = deriveTitle(trimmed);
      setSessionTitle(title);
      document.title = `${title} - Future Search`;
    }

    let sources: Document[] | undefined = undefined;
    let receivedMessage = "";
    let added = false;

    ws.send(
      JSON.stringify({
        type: "message",
        content: trimmed,
        focusMode: focusMode,
        copilot: copilotEnabled ? "enabled" : "disabled",
        history: [...chatHistory, ["human", trimmed]],
      })
    );

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: trimmed,
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
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              return { ...msg, content: msg.content + data.data };
            }
            return msg;
          })
        );

        receivedMessage += data.data;
        setMessageAppeared(true);
      }

      if (data.type === "messageEnd") {
        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", trimmed],
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

    if (index <= 0 || messages[index - 1]?.role !== "user") return;

    const userMessage = messages[index - 1];

    setMessages((prev) => prev.slice(0, index - 1));
    setChatHistory((prev) => prev.slice(0, index - 1));

    sendMessage(userMessage.content);
  };

  if (!hydrated) {
    return null;
  }

  return (
    <div>
      {messages.length > 0 ? (
        <>
          <Navbar
            title={sessionTitle}
            messages={messages}
            onClearChat={clearChat}
          />
          <Chat
            loading={loading}
            isConnected={isConnected}
            messages={messages}
            sendMessage={sendMessage}
            messageAppeared={messageAppeared}
            rewrite={rewrite}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            copilotEnabled={copilotEnabled}
            setCopilotEnabled={setCopilotEnabled}
          />
        </>
      ) : (
        <EmptyChat
          sendMessage={sendMessage}
          isConnected={isConnected}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          copilotEnabled={copilotEnabled}
          setCopilotEnabled={setCopilotEnabled}
        />
      )}
    </div>
  );
};

export default ChatWindow;
