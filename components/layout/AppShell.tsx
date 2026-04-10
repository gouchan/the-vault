"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

const HIDE_DELAY = 400;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On non-board pages, show sidebar by default (pinned).
  // On board pages, hide it by default so the canvas gets full screen.
  const isBoardPage = pathname?.startsWith("/board/") ?? false;

  useEffect(() => {
    if (!isBoardPage) {
      setPinned(true);
      setVisible(true);
    } else {
      setPinned(false);
      setVisible(false);
    }
  }, [isBoardPage]);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = useCallback(() => {
    if (pinned) return;
    clearHideTimer();
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, [pinned]);

  const showSidebar = useCallback(() => {
    clearHideTimer();
    setVisible(true);
  }, []);

  const togglePin = useCallback(() => {
    setPinned((p) => {
      const next = !p;
      if (next) setVisible(true);
      return next;
    });
  }, []);

  const handleCreated = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vault:refresh"));
  }, []);

  useEffect(() => () => clearHideTimer(), []);

  return (
    <div className="flex h-screen relative">
      {/* Hover trigger zone on the left edge (only on board pages) */}
      {isBoardPage && !visible && (
        <div
          className="fixed top-0 left-0 h-full w-3 z-40"
          onMouseEnter={showSidebar}
        />
      )}

      {/* Sidebar — slides in/out on board pages, static elsewhere */}
      <div
        className={`${
          isBoardPage
            ? "fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out"
            : "relative"
        } ${isBoardPage && !visible ? "-translate-x-full" : "translate-x-0"}`}
        onMouseEnter={isBoardPage ? showSidebar : undefined}
        onMouseLeave={isBoardPage ? scheduleHide : undefined}
      >
        <Sidebar collapsed={false} onToggle={togglePin} />
      </div>

      <main className="flex-1 overflow-y-auto dot-grid">
        {children}
      </main>
      <CommandPalette onCreated={handleCreated} />
    </div>
  );
}
