"use client";

import { useState, useEffect, useCallback } from "react";
import { getHistory, getHistorySnapshot, saveTldrawSnapshot } from "@/lib/actions/tldraw";
import type { HistoryEntry } from "@/lib/actions/tldraw";
import { Clock, RotateCcw, X } from "lucide-react";

interface HistoryTimelineProps {
  boardId: string;
  onPreviewSnapshot?: (snapshot: Record<string, any> | null) => void;
  onRestoreSnapshot?: (snapshot: Record<string, any>) => void;
}

export function HistoryTimeline({
  boardId,
  onPreviewSnapshot,
  onRestoreSnapshot,
}: HistoryTimelineProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load history entries
  useEffect(() => {
    async function load() {
      try {
        const data = await getHistory(boardId);
        setEntries(data);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId]);

  // Preview a snapshot
  const handlePreview = useCallback(
    async (entry: HistoryEntry) => {
      setSelectedId(entry.id);
      setPreviewLoading(true);
      try {
        const data = await getHistorySnapshot(entry.id);
        if (data) {
          onPreviewSnapshot?.(data.snapshot);
        }
      } catch (err) {
        console.error("Failed to load snapshot:", err);
      } finally {
        setPreviewLoading(false);
      }
    },
    [onPreviewSnapshot]
  );

  // Restore a snapshot as current
  const handleRestore = useCallback(
    async () => {
      if (!selectedId) return;
      try {
        const data = await getHistorySnapshot(selectedId);
        if (data) {
          await saveTldrawSnapshot(boardId, data.snapshot);
          onRestoreSnapshot?.(data.snapshot);
          setSelectedId(null);
          onPreviewSnapshot?.(null); // Clear preview mode
        }
      } catch (err) {
        console.error("Failed to restore snapshot:", err);
      }
    },
    [boardId, selectedId, onPreviewSnapshot, onRestoreSnapshot]
  );

  // Cancel preview
  const handleCancelPreview = useCallback(() => {
    setSelectedId(null);
    onPreviewSnapshot?.(null);
  }, [onPreviewSnapshot]);

  // Format time
  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3 text-xs text-[var(--muted-foreground)]">
        <Clock className="h-3 w-3 mr-1 animate-pulse" /> Loading history...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-xs text-[var(--muted-foreground)]">
        <Clock className="h-3 w-3 mr-1" /> No history yet — edits are saved every 60 seconds
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
      {/* Selected snapshot actions */}
      {selectedId && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <span className="text-xs text-blue-400">
            {previewLoading ? "Loading preview..." : "Previewing snapshot"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              className="flex items-center gap-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Restore this version
            </button>
            <button
              onClick={handleCancelPreview}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Timeline bar */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {entries.map((entry, i) => {
            const isSelected = entry.id === selectedId;
            const isHovered = entry.id === hoveredId;

            return (
              <div key={entry.id} className="flex items-center">
                {/* Dot */}
                <button
                  className={`relative group flex-shrink-0 transition-all duration-150 ${
                    isSelected
                      ? "w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30"
                      : "w-2 h-2 rounded-full bg-[var(--muted-foreground)]/40 hover:bg-[var(--muted-foreground)] hover:w-3 hover:h-3"
                  }`}
                  onClick={() => handlePreview(entry)}
                  onMouseEnter={() => setHoveredId(entry.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  title={new Date(entry.created_at).toLocaleString()}
                />

                {/* Tooltip */}
                {(isHovered || isSelected) && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--popover)] border border-[var(--border)] rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-lg z-50 pointer-events-none">
                    {formatTime(entry.created_at)}
                    {entry.label && (
                      <span className="ml-1 text-[var(--muted-foreground)]">
                        — {entry.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Connector line */}
                {i < entries.length - 1 && (
                  <div className="w-4 h-px bg-[var(--muted-foreground)]/20 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
