"use client";

import { Fragment, useEffect, useRef } from "react";
import { Message } from "./ChatWindow";
import MessageBox from "./MessageBox";
import MessageBoxLoading from "./MessageBoxLoading";
import ChatBar from "./ChatBar";
import { useAppShell } from "@/context/AppShellContext";
import { cn } from "@/lib/utils";

const Chat = ({
  loading,
  isConnected,
  messages,
  sendMessage,
  messageAppeared,
  rewrite,
  focusMode,
  setFocusMode,
  copilotEnabled,
  setCopilotEnabled,
}: {
  messages: Message[];
  sendMessage: (message: string) => void;
  loading: boolean;
  messageAppeared: boolean;
  rewrite: (messageId: string) => void;
  isConnected: boolean;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  copilotEnabled: boolean;
  setCopilotEnabled: (enabled: boolean) => void;
}) => {
  const { sidebarOpen } = useAppShell();
  const messageEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth" });

    if (messages.length === 1) {
      document.title = `${messages[0].content.substring(0, 30)} - Future Search`;
    }
  }, [messages]);

  return (
    <div className="flex flex-col space-y-6 pt-4 pb-36">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        return (
          <Fragment key={msg.id ?? i}>
            <MessageBox
              message={msg}
              history={messages}
              loading={loading}
              isLast={isLast}
              rewrite={rewrite}
              messageIndex={i}
              sendMessage={sendMessage}
            />
            {!isLast && msg.role === "assistant" && (
              <div className="h-px w-full bg-[#1C1C1C]" />
            )}
          </Fragment>
        );
      })}
      {loading && !messageAppeared && <MessageBoxLoading />}
      <div ref={messageEnd} className="h-0" />

      <div
        className={cn(
          "fixed bottom-6 z-40 right-0 px-4 lg:px-8 transition-[left] duration-200",
          sidebarOpen ? "left-0 lg:left-[280px]" : "left-0"
        )}
      >
        <div className="mx-auto max-w-3xl w-full">
          <ChatBar
            sendMessage={sendMessage}
            loading={loading}
            isConnected={isConnected}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            copilotEnabled={copilotEnabled}
            setCopilotEnabled={setCopilotEnabled}
            placeholder="Ask a follow up..."
            minRows={1}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
