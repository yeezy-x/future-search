import { Message } from "./ChatWindow";
import { formatTimeDifference } from "@/lib/utils";
import { Clock, Share, Trash } from "lucide-react";

const Navbar = ({
  title,
  messages,
  onClearChat,
}: {
  title: string;
  messages: Message[];
  onClearChat: () => void;
}) => {
  const firstMessage = messages[0];
  const timeAgo =
    firstMessage
      ? formatTimeDifference(new Date(), firstMessage.createdAt)
      : "";

  const handleShare = async () => {
    const shareText = messages
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Future Search chat",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
      return;
    }

    await navigator.clipboard.writeText(shareText);
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-2 flex flex-row items-center justify-between gap-3 text-sm border-b border-[#1C1C1C] bg-[#0A0A0A]/95 backdrop-blur-sm">
      <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
        <Clock size={15} className="text-white/40 shrink-0 hidden sm:block" />
        <p className="text-white font-medium truncate">{title}</p>
        {timeAgo && (
          <span className="text-white/40 text-xs shrink-0 hidden md:inline">
            · {timeAgo}
          </span>
        )}
      </div>
      <div className="flex flex-row gap-3 items-center shrink-0 text-white/60">
        <button
          type="button"
          aria-label="Share chat"
          onClick={handleShare}
          className="hover:text-white active:scale-95 transition"
        >
          <Share size={17} />
        </button>
        <button
          type="button"
          aria-label="Delete chat"
          onClick={onClearChat}
          className="hover:text-white active:scale-95 transition"
        >
          <Trash size={17} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
