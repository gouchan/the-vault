"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getHistory, getHistorySnapshot, saveTldrawSnapshot } from "@/lib/actions/tldraw";
import type { HistoryEntry } from "@/lib/actions/tldraw";
import { Clock, RotateCcw, X } from "lucide-react";

interface HistoryTimelineProps {
  boardId: string;
  onPreviewSnapshot?: (snapshot: Record<string, any> | null) => void;
  onRestoreSnapshot?: (snapshot: Record<string, any>) => void;
}

// Extract element count from an Excalidraw snapshot
function getSnapshotShapeCount(snapshot: Record<string, any>): number {
  try {
    // Excalidraw format: { elements: [...], appState: {...} }
    if (Array.isArray(snapshot?.elements)) {
      return snapshot.elements.filter(
        (el: any) => el.customData?.vaultBlockId && !el.isDeleted
      ).length;
    }
    // Legacy tldraw format fallback
    const store = snapshot?.store || snapshot?.document?.store || {};
    return Object.keys(store).filter((k) => k.startsWith("shape:")).length;
  } catch {
    return 0;
  }
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
  const [previewShapeCount, setPreviewShapeCount] = useState<number | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; entry: HistoryEntry; index: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reverse so newest is on the right (must be above early returns to respect Rules of Hooks)
  const reversed = useMemo(() => [...entries].reverse(), [entries]);

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
      if (selectedId === entry.id) {
        setSelectedId(null);
        setPreviewShapeCount(null);
        onPreviewSnapshot?.(null);
        return;
      }

      setSelectedId(entry.id);
      setPreviewLoading(true);
      setPreviewShapeCount(null);
      try {
        const data = await getHistorySnapshot(entry.id);
        if (data) {
          setPreviewShapeCount(getSnapshotShapeCount(data.snapshot));
          onPreviewSnapshot?.(data.snapshot);
        }
      } catch (err) {
        console.error("Failed to load snapshot:", err);
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedId, onPreviewSnapshot]
  );

  // Restore a snapshot as current
  const handleRestore = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = await getHistorySnapshot(selectedId);
      if (data) {
        await saveTldrawSnapshot(boardId, data.snapshot);
        onRestoreSnapshot?.(data.snapshot);
        setSelectedId(null);
        setPreviewShapeCount(null);
        onPreviewSnapshot?.(null);
      }
    } catch (err) {
      console.error("Failed to restore snapshot:", err);
    }
  }, [boardId, selectedId, onPreviewSnapshot, onRestoreSnapshot]);

  // Cancel preview
  const handleCancelPreview = useCallback(() => {
    setSelectedId(null);
    setPreviewShapeCount(null);
    onPreviewSnapshot?.(null);
  }, [onPreviewSnapshot]);

  // Format relative time
  function formatRelativeTime(dateStr: string): string {
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

  // Format time for tooltip
  function formatTooltipTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // How many saves ago
  function savesAgo(reversedIndex: number): string {
    if (reversedIndex === 0) return "Latest";
    if (reversedIndex === 1) return "1 save ago";
    return `${reversedIndex} saves ago`;
  }

  // Handle dot hover with tooltip positioning
  const handleDotHover = (e: React.MouseEvent, entry: HistoryEntry, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = scrollRef.current?.getBoundingClientRect();
    if (parentRect) {
      setTooltipInfo({
        x: rect.left - parentRect.left + rect.width / 2,
        entry,
        index,
      });
    }
    setHoveredId(entry.id);
  };

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
        <Clock className="h-3 w-3 mr-1" /> No history yet — snapshots save every 60s
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm flex-shrink-0">
      {/* Selected snapshot action bar */}
      {selectedId && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--sticky-yellow)]/10 border-b border-[var(--sticky-yellow)]/20">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--sticky-yellow)] font-medium">
              {previewLoading ? "Loading..." : "Previewing snapshot"}
            </span>
            {previewShapeCount !== null && !previewLoading && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {previewShapeCount} shape{previewShapeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              className="flex items-center gap-1 text-xs bg-[var(--sticky-yellow)]/20 hover:bg-[var(--sticky-yellow)]/30 text-[var(--sticky-yellow)] px-2 py-1 rounded font-medium transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Restore
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

      {/* Horizontal dot timeline */}
      <div className="relative px-4 py-3" ref={scrollRef}>
        {/* Tooltip — clamped to stay within container bounds */}
        {tooltipInfo && hoveredId && (
          <div
            className="absolute bottom-full mb-2 px-2.5 py-1.5 rounded-md bg-[var(--card)] border border-[var(--border)] shadow-lg text-xs pointer-events-none z-10 whitespace-nowrap"
            style={{
              left: `clamp(60px, ${tooltipInfo.x}px, calc(100% - 60px))`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium text-[var(--foreground)]">
              {formatTooltipTime(tooltipInfo.entry.created_at)}
            </div>
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
              {formatRelativeTime(tooltipInfo.entry.created_at)} · {savesAgo(tooltipInfo.index)}
            </div>
            {tooltipInfo.entry.label && (
              <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 italic">
                {tooltipInfo.entry.label}
              </div>
            )}
          </div>
        )}

        {/* Timeline track */}
        <div className="flex items-center gap-0">
          {/* Left label */}
          <span className="text-[10px] text-[var(--muted-foreground)] mr-3 flex-shrink-0">Oldest</span>

          {/* Track line with dots */}
          <div className="flex-1 relative flex items-center">
            {/* Background line */}
            <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-[var(--border)]" />

            {/* Dots */}
            <div className="relative flex items-center justify-between w-full">
              {reversed.map((entry, i) => {
                const isSelected = entry.id === selectedId;
                const isHovered = entry.id === hoveredId;
                const isLatest = i === reversed.length - 1;

                return (
                  <button
                    key={entry.id}
                    onClick={() => handlePreview(entry)}
                    onMouseEnter={(e) => handleDotHover(e, entry, reversed.length - 1 - i)}
                    onMouseLeave={() => {
                      setHoveredId(null);
                      setTooltipInfo(null);
                    }}
                    className="relative z-[1] group flex flex-col items-center"
                    title=""
                  >
                    {/* Dot */}
                    <div
                      className={`rounded-full transition-all duration-200 ${
                        isSelected
                          ? "w-3.5 h-3.5 bg-[var(--sticky-yellow)] shadow-[0_0_8px_var(--sticky-yellow)]"
                          : isHovered
                          ? "w-3 h-3 bg-[var(--sticky-yellow)]/70"
                          : isLatest
                          ? "w-2.5 h-2.5 bg-[var(--foreground)]/50"
                          : "w-2 h-2 bg-[var(--muted-foreground)]/40 group-hover:bg-[var(--muted-foreground)]/70"
                      }`}
                    />

                    {/* Latest label */}
                    {isLatest && !isSelected && (
                      <span className="absolute top-full mt-1 text-[9px] uppercase tracking-wider font-medium text-[var(--sticky-yellow)]">
                        Now
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right label */}
          <span className="text-[10px] text-[var(--muted-foreground)] ml-3 flex-shrink-0">Latest</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
        <span>{entries.length} snapshot{entries.length !== 1 ? "s" : ""}</span>
        <span>Auto-saved every 60s</span>
      </div>
    </div>
  );
}
