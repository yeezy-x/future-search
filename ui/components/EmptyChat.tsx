import ChatBar from "./ChatBar";

const EmptyChat = ({
  sendMessage,
  focusMode,
  setFocusMode,
  isConnected,
  copilotEnabled,
  setCopilotEnabled,
}: {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  isConnected: boolean;
  copilotEnabled: boolean;
  setCopilotEnabled: (enabled: boolean) => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] w-full px-2 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-white text-3xl font-medium tracking-tight">
          What do you want to know?
        </h1>
        <p className="text-white/50 text-sm">
          Search the web, papers, videos, and more
        </p>
      </div>
      <ChatBar
        sendMessage={sendMessage}
        isConnected={isConnected}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        copilotEnabled={copilotEnabled}
        setCopilotEnabled={setCopilotEnabled}
        placeholder="Ask anything..."
        minRows={2}
        className="max-w-2xl w-full"
      />
    </div>
  );
};

export default EmptyChat;
