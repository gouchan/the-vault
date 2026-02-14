"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutGrid,
  Users,
  Search,
  Plus,
  Home,
  ChevronDown,
  ChevronRight,
  Vault,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { getBoards } from "@/lib/actions/boards";
import { createBlock } from "@/lib/actions/blocks";
import type { Block } from "@/types/block";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [boards, setBoards] = useState<Block[]>([]);
  const [boardsOpen, setBoardsOpen] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      const data = await getBoards();
      setBoards(data);
    } catch {}
  }

  async function handleCreateBoard() {
    const title = prompt("Board name:");
    if (!title) return;
    await createBlock({ type: "board", title });
    loadBoards();
  }

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/people", icon: Users, label: "People" },
    { href: "/search", icon: Search, label: "Search" },
  ];

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
        <Vault className="h-5 w-5" />
        <span className="text-sm font-bold tracking-tight">THE VAULT</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--accent)]",
                pathname === item.href
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Boards section */}
        <div className="mt-6">
          <div
            onClick={() => setBoardsOpen(!boardsOpen)}
            className="flex w-full cursor-pointer items-center justify-between px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
          >
            <span>Boards</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateBoard();
                }}
                className="rounded p-0.5 hover:bg-[var(--accent)]"
              >
                <Plus className="h-3 w-3" />
              </button>
              {boardsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>
          </div>

          {boardsOpen && (
            <div className="mt-1 space-y-0.5">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[var(--accent)]",
                    pathname === `/board/${board.id}`
                      ? "bg-[var(--accent)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="truncate">{board.title || "Untitled"}</span>
                </Link>
              ))}
              {boards.length === 0 && (
                <p className="px-3 py-1 text-xs text-[var(--muted-foreground)] opacity-50">
                  No boards yet
                </p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-2 space-y-1">
        {/* Theme toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-[var(--muted-foreground)]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-3 w-3" />
            ) : (
              <Moon className="mr-2 h-3 w-3" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-[var(--muted-foreground)]"
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="mr-2 h-3 w-3" />
          Search... <kbd className="ml-auto text-[10px] opacity-50">⌘K</kbd>
        </Button>
      </div>
    </aside>
  );
}
