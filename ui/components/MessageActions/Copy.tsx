import { useState } from "react";
import { Document } from "@langchain/core/documents";
import { Message } from "../ChatWindow";
import { Check, ClipboardList } from "lucide-react";

const Copy = ({
  message,
  initialMessage,
}: {
  message: Message;
  initialMessage: string;
}) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label="Copy answer"
      onClick={() => {
        const citations =
          message.sources && message.sources.length > 0
            ? `\n\nCitations:\n${message.sources
                .map(
                  (source: Document, i: number) =>
                    `[${i + 1}] ${source.metadata.url}`
                )
                .join("\n")}`
            : "";

        const contentToCopy = `${initialMessage}${citations}`;
        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      }}
      className="p-2 text-white/70 rounded-xl hover:bg-[#1c1c1c] transition duration-200 hover:text-white"
    >
      {copied ? <Check size={18} /> : <ClipboardList size={18} />}
    </button>
  );
};

export default Copy;
