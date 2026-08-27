"use client";

import { useAppShell } from "@/context/AppShellContext";
import Layout from "./Layout";
import SettingsDialog from "./SettingsDialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
  SquareIcon,
} from "lucide-react";

const SIDEBAR_WIDTH = 280;

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    sessions,
    deleteSession,
  } = useAppShell();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeSessionId =
    pathname.startsWith("/c/") ? pathname.split("/c/")[1] : null;

  const handleNewChat = () => {
    router.push("/");
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteSession(id);
    if (activeSessionId === id) router.push("/");
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#111111] border-r border-[#1C1C1C] transition-transform duration-200 ease-out",
          "w-[280px] max-w-[85vw]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-4 border-b border-[#1C1C1C]">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-medium text-sm min-w-0"
            onClick={() => {
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
          >
            <SquareIcon size={18} className="shrink-0" />
            <span className="truncate">Future Search</span>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="px-3 py-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition"
          >
            <Plus size={18} />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
          <p className="px-2 py-2 text-xs font-medium text-white/40 uppercase tracking-wide">
            Recent
          </p>
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-white/40">No chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <li key={session.id}>
                    <Link
                      href={`/c/${session.id}`}
                      onClick={() => {
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition w-full text-left",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="truncate flex-1 min-w-0">
                        {session.title}
                      </span>
                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={(e) => handleDelete(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-3 py-3 border-t border-[#1C1C1C]">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setIsSettingsOpen(true)}
            className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        <SettingsDialog isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
      </aside>

      {/* Collapsed toggle (desktop + mobile when sidebar hidden) */}
      {!sidebarOpen && (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 p-2 rounded-xl bg-[#111111] border border-[#1C1C1C] text-white/70 hover:text-white hover:bg-[#1c1c1c] transition shadow-lg"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <Layout sidebarOpen={sidebarOpen}>{children}</Layout>
    </div>
  );
};

export default Sidebar;
