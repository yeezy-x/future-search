export type MessageRole = "user" | "assistant";

export type Source = {
  title: string;
  url: string;
  content?: string;
  source?: string;
  score?: number;
  publishedAt?: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  sources?: Source[];
  createdAt: Date;
};