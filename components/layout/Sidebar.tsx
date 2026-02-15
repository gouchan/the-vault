"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutGrid,
  Search,
  Plus,
  Home,
  ChevronDown,
  ChevronRight,
  Vault,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical,
  Pin,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { getBoards } from "@/lib/actions/boards";
import { createBlock, updateBlock } from "@/lib/actions/blocks";
import type { Block } from "@/types/block";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [boards, setBoards] = useState<Block[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsError, setBoardsError] = useState(false);
  const [boardsOpen, setBoardsOpen] = useState(true);

  // Drag reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    loadBoards();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handler = () => loadBoards();
    window.addEventListener("vault:refresh", handler);
    return () => window.removeEventListener("vault:refresh", handler);
  }, []);

  async function loadBoards() {
    setBoardsLoading(true);
    setBoardsError(false);
    try {
      const data = await getBoards();
      // Read board order once (not inside comparator)
      const order = getBoardOrder();
      const sorted = [...data].sort((a, b) => {
        // Pinned always first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Then by custom order stored in localStorage
        const aIdx = order.indexOf(a.id);
        const bIdx = order.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setBoards(sorted);
    } catch (err) {
      console.error("Failed to load boards:", err);
      setBoardsError(true);
    } finally {
      setBoardsLoading(false);
    }
  }

  function getBoardOrder(): string[] {
    try {
      return JSON.parse(localStorage.getItem("vault-board-order") || "[]");
    } catch {
      return [];
    }
  }

  function saveBoardOrder(ids: string[]) {
    localStorage.setItem("vault-board-order", JSON.stringify(ids));
  }

  async function handleCreateBoard() {
    const title = prompt("Board name:");
    if (!title) return;
    await createBlock({ type: "board", title });
    loadBoards();
  }

  async function handleTogglePin(board: Block, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await updateBlock(board.id, { pinned: !board.pinned });
    loadBoards();
  }

  // ── Drag handlers ──────────────────────────────────────────
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newBoards = [...boards];
    const [moved] = newBoards.splice(dragIndex, 1);
    newBoards.splice(index, 0, moved);
    setBoards(newBoards);
    saveBoardOrder(newBoards.map((b) => b.id));
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
  ];

  // ── Collapsed state ────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="flex h-screen w-12 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] items-center py-3 gap-2">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <div className="mt-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-colors hover:bg-[var(--accent)]",
                pathname === item.href
                  ? "bg-[var(--accent)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]"
              )}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
          <button
            onClick={handleCreateBoard}
            className="flex items-center justify-center p-2 rounded-md transition-colors text-[var(--muted-foreground)] hover:bg-[var(--sticky-yellow)]/10 hover:text-[var(--sticky-yellow)]"
            title="Add Board"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        {mounted && (
          <button
            className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        )}
      </aside>
    );
  }

  // ── Expanded state ─────────────────────────────────────────
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      {/* Logo + collapse */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-2">
          <Vault className="h-5 w-5" />
          <span className="text-sm font-bold tracking-tight">THE VAULT</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
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
          <button
            onClick={handleCreateBoard}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--sticky-yellow)]/10 hover:text-[var(--sticky-yellow)]"
          >
            <Plus className="h-4 w-4" />
            Add Board
          </button>
        </div>

        {/* Boards section */}
        <div className="mt-6">
          <div
            onClick={() => setBoardsOpen(!boardsOpen)}
            className="flex w-full cursor-pointer items-center justify-between px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
          >
            <span>Boards</span>
            {boardsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>

          {boardsOpen && (
            <div className="mt-1 space-y-0.5">
              {/* Board loading skeletons */}
              {boardsLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
                      <div className="h-3.5 w-3.5 rounded bg-[var(--muted)] flex-shrink-0" />
                      <div className="h-3 rounded bg-[var(--muted)] flex-1" style={{ maxWidth: `${60 + i * 15}%` }} />
                    </div>
                  ))}
                </>
              )}
              {!boardsLoading && boards.map((board, index) => (
                <div
                  key={board.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group relative transition-all duration-150",
                    dragOverIndex === index && dragIndex !== index && "border-t-2 border-[var(--sticky-yellow)]",
                    dragIndex === index && "opacity-40"
                  )}
                >
                  <Link
                    href={`/board/${board.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[var(--accent)]",
                      pathname === `/board/${board.id}`
                        ? "bg-[var(--accent)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {/* Drag handle */}
                    <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-40 cursor-grab flex-shrink-0 transition-opacity" />
                    <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{board.title || "Untitled"}</span>
                    {/* Single pin button — yellow when pinned, grey on hover when unpinned */}
                    <button
                      onClick={(e) => handleTogglePin(board, e)}
                      className={cn(
                        "flex-shrink-0 p-0.5 rounded transition-all",
                        board.pinned
                          ? "opacity-100 text-[var(--pin-active)]"
                          : "opacity-0 group-hover:opacity-60 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                      title={board.pinned ? "Unpin" : "Pin to top"}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              ))}
              {!boardsLoading && boardsError && (
                <button
                  onClick={loadBoards}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="opacity-50">Failed to load.</span>
                  <span className="underline">Retry</span>
                </button>
              )}
              {!boardsLoading && !boardsError && boards.length === 0 && (
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
