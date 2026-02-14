"use client";

import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

const SIDEBAR_KEY = "vault-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const handleCreated = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vault:refresh"));
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-y-auto dot-grid">
        {children}
      </main>
      <CommandPalette onCreated={handleCreated} />
    </div>
  );
}
