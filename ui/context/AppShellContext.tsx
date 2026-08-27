"use client";

import {
  ChatSession,
  loadSessions,
  loadSidebarOpen,
  saveSessions,
  saveSidebarOpen,
  generateSessionId,
  deriveTitle,
} from "@/lib/chatSessions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AppShellContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  sessions: ChatSession[];
  createSession: () => ChatSession;
  updateSession: (id: string, patch: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => ChatSession | undefined;
  refreshSessions: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export const AppShellProvider = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSessions(loadSessions());
      setSidebarOpenState(loadSidebarOpen());
      setHydrated(true);
    });
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    saveSidebarOpen(open);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      saveSidebarOpen(next);
      return next;
    });
  }, []);

  const refreshSessions = useCallback(() => {
    setSessions(loadSessions());
  }, []);

  const persist = useCallback((next: ChatSession[]) => {
    const sorted = [...next].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setSessions(sorted);
    saveSessions(sorted);
  }, []);

  const createSession = useCallback(() => {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: generateSessionId(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
      chatHistory: [],
      focusMode: "webSearch",
      copilotEnabled: false,
    };
    persist([session, ...loadSessions()]);
    return session;
  }, [persist]);

  const updateSession = useCallback(
    (id: string, patch: Partial<ChatSession>) => {
      const current = loadSessions();
      const next = current.map((s) => {
        if (s.id !== id) return s;
        const updated = {
          ...s,
          ...patch,
          updatedAt: patch.updatedAt ?? new Date().toISOString(),
        };
        if (patch.messages?.length && updated.title === "New chat") {
          const firstUser = patch.messages.find((m) => m.role === "user");
          if (firstUser?.content) {
            updated.title = deriveTitle(firstUser.content);
          }
        }
        return updated;
      });
      persist(next);
    },
    [persist]
  );

  const deleteSession = useCallback(
    (id: string) => {
      const next = loadSessions().filter((s) => s.id !== id);
      persist(next);
    },
    [persist]
  );

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id),
    [sessions]
  );

  const value = useMemo(
    () => ({
      sidebarOpen,
      toggleSidebar,
      setSidebarOpen,
      sessions,
      createSession,
      updateSession,
      deleteSession,
      getSession,
      refreshSessions,
    }),
    [
      sidebarOpen,
      toggleSidebar,
      setSidebarOpen,
      sessions,
      createSession,
      updateSession,
      deleteSession,
      getSession,
      refreshSessions,
    ]
  );

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]" aria-hidden="true" />
    );
  }

  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
};

export const useAppShell = (): AppShellContextValue => {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
};
