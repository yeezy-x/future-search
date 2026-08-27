"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CopilotToggle, Focus } from "./MessageInputActions";
import { ArrowUp } from "lucide-react";

type ChatBarProps = {
  sendMessage: (message: string) => void;
  loading?: boolean;
  isConnected: boolean;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  copilotEnabled: boolean;
  setCopilotEnabled: (enabled: boolean) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
};

const ChatBar = ({
  sendMessage,
  loading = false,
  isConnected,
  focusMode,
  setFocusMode,
  copilotEnabled,
  setCopilotEnabled,
  placeholder = "Ask anything...",
  minRows = 1,
  className,
}: ChatBarProps) => {
  const [message, setMessage] = useState("");

  const disabled = loading || !isConnected;
  const canSend = message.trim().length > 0 && !disabled;
  const isExpanded = minRows > 1 || message.includes("\n");

  const handleSend = () => {
    if (!canSend) return;
    sendMessage(message);
    setMessage("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-[#1C1C1C] bg-[#111111] shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-visible transition-all duration-200",
          isExpanded ? "px-4 pt-4 pb-3" : "px-3 py-2"
        )}
      >
        <TextareaAutosize
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={minRows}
          className={cn(
            "bg-transparent placeholder:text-white/40 text-sm text-white resize-none focus:outline-none w-full max-h-32 lg:max-h-40",
            isExpanded ? "min-h-[2.5rem]" : "min-h-[1.75rem] py-1"
          )}
          placeholder={isConnected ? placeholder : "Connecting..."}
        />

        <div
          className={cn(
            "flex flex-row items-center justify-between gap-2",
            isExpanded ? "mt-3 pt-1" : "mt-1"
          )}
        >
          <div className="flex flex-row items-center gap-1 shrink-0">
            <Focus focusMode={focusMode} setFocusMode={setFocusMode} />
          </div>

          <div className="flex flex-row items-center gap-3 shrink-0">
            <CopilotToggle
              copilotEnabled={copilotEnabled}
              setCopilotEnabled={setCopilotEnabled}
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="bg-[#24A0ED] text-white disabled:text-white/40 hover:bg-[#1f8fd4] transition duration-150 disabled:bg-[#1c1c1c] rounded-full p-2 shrink-0"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ChatBar;
