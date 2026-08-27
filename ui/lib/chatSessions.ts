import { Document } from "@langchain/core/documents";

export type StoredMessage = {
  id: string;
  createdAt: string;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Array<{
    pageContent: string;
    metadata: Record<string, unknown>;
  }>;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
  chatHistory: [string, string][];
  focusMode: string;
  copilotEnabled: boolean;
};

const STORAGE_KEY = "future-search-sessions";
const SIDEBAR_KEY = "future-search-sidebar-open";

export const generateSessionId = (): string =>
  Math.random().toString(36).substring(2, 11);

export const deriveTitle = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return "New chat";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48).trim()}…` : trimmed;
};

export const loadSessions = (): ChatSession[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveSessions = (sessions: ChatSession[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const loadSidebarOpen = (): boolean => {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(SIDEBAR_KEY);
  return raw === null ? true : raw === "true";
};

export const saveSidebarOpen = (open: boolean): void => {
  localStorage.setItem(SIDEBAR_KEY, String(open));
};

export const storedToDocuments = (
  sources: StoredMessage["sources"]
): Document[] | undefined => {
  if (!sources?.length) return undefined;
  return sources.map(
    (s) =>
      new Document({
        pageContent: s.pageContent,
        metadata: s.metadata,
      })
  );
};

export const documentsToStored = (
  sources: Document[] | undefined
): StoredMessage["sources"] => {
  if (!sources?.length) return undefined;
  return sources.map((s) => ({
    pageContent: s.pageContent,
    metadata: s.metadata as Record<string, unknown>,
  }));
};
