import { Message } from "@/components/ChatWindow";

export const getSuggestions = async (chatHistory: Message[]) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suggestions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_history: chatHistory,
      chat_model: "gemini-2.5-flash",
      chat_model_provider: "gemini",
    }),
  });
  const data = (await res.json()) as { suggestions: string[] };
  return data.suggestions;
};