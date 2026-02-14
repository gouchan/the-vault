"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Trigger a page-level refresh via custom event
    window.dispatchEvent(new CustomEvent("vault:refresh"));
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto dot-grid">
        {children}
      </main>
      <CommandPalette onCreated={handleCreated} />
    </div>
  );
}
