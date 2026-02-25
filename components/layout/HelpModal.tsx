"use client";

import { useState } from "react";
import { X, Circle } from "lucide-react";

interface ShortcutRowProps {
  label: string;
  keys: (string | string[])[];
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] leading-none">
      {children}
    </kbd>
  );
}

function ShortcutRow({ label, keys }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-[var(--muted-foreground)] mx-0.5">or</span>}
            {Array.isArray(k) ? (
              k.map((part, j) => (
                <span key={j} className="flex items-center gap-0.5">
                  {j > 0 && <span className="text-[10px] text-[var(--muted-foreground)]">+</span>}
                  <Key>{part}</Key>
                </span>
              ))
            ) : (
              <Key>{k}</Key>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]/60 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start p-3" onClick={onClose}>
      <div
        className="w-80 max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--background)] z-10">
          <div>
            <h2 className="text-sm font-semibold">Rosary Help</h2>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Shortcuts &amp; usage guide</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Concepts */}
          <Section title="Concepts">
            <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex gap-2">
                <Circle className="h-3 w-3 mt-0.5 flex-shrink-0 text-[var(--sticky-yellow)]" />
                <span><strong className="text-[var(--foreground)]">Beads</strong> — individual items: people, references, notes</span>
              </div>
              <div className="flex gap-2">
                <Circle className="h-3 w-3 mt-0.5 flex-shrink-0 text-[var(--sticky-yellow)]" />
                <span><strong className="text-[var(--foreground)]">Garlands</strong> — infinite canvas boards that hold beads</span>
              </div>
              <div className="flex gap-2">
                <Circle className="h-3 w-3 mt-0.5 flex-shrink-0 text-[var(--sticky-yellow)]" />
                <span><strong className="text-[var(--foreground)]">Connectors</strong> — arrows between beads that sync shared data</span>
              </div>
            </div>
          </Section>

          {/* How to connect */}
          <Section title="How to Connect Beads">
            <div className="space-y-2.5 text-xs text-[var(--muted-foreground)]">
              <div className="flex gap-2">
                <span className="text-[var(--sticky-yellow)] font-bold flex-shrink-0 w-3 text-center">1</span>
                <span>Click <strong className="text-[var(--foreground)]">Connect</strong> in the toolbar, or press <Key>A</Key></span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--sticky-yellow)] font-bold flex-shrink-0 w-3 text-center">2</span>
                <span>Click a <strong className="text-[var(--foreground)]">source bead</strong> and drag the arrow to a <strong className="text-[var(--foreground)]">target bead</strong></span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--sticky-yellow)] font-bold flex-shrink-0 w-3 text-center">3</span>
                <span>Shared fields sync automatically: <strong className="text-[var(--foreground)]">URL, description, notes, tags, OG metadata</strong></span>
              </div>
              <p className="text-[10px] opacity-60 pt-0.5 pl-5">Only empty fields on the target are filled — existing data is never overwritten.</p>
            </div>
          </Section>

          {/* App shortcuts */}
          <Section title="App">
            <ShortcutRow label="Open command palette" keys={[["⌘", "K"]]} />
            <ShortcutRow label="Search everything" keys={[["⌘", "K"]]} />
            <ShortcutRow label="Toggle sidebar" keys={[]} />
          </Section>

          {/* Canvas — Navigation */}
          <Section title="Canvas — Navigate">
            <ShortcutRow label="Pan canvas" keys={[["Space", "drag"], ["Wheel", "drag"]]} />
            <ShortcutRow label="Zoom in / out" keys={[["⌘", "+"], ["⌘", "−"]]} />
            <ShortcutRow label="Reset canvas" keys={[["⌘", "Delete"]]} />
            <ShortcutRow label="Select all" keys={[["⌘", "A"]]} />
          </Section>

          {/* Canvas — Tools */}
          <Section title="Canvas — Tools">
            <ShortcutRow label="Select" keys={["V", "1"]} />
            <ShortcutRow label="Hand (pan)" keys={["H"]} />
            <ShortcutRow label="Draw (freehand)" keys={["P", "7"]} />
            <ShortcutRow label="Arrow / Connect" keys={["A", "5"]} />
            <ShortcutRow label="Text" keys={["T", "8"]} />
            <ShortcutRow label="Rectangle" keys={["R", "2"]} />
            <ShortcutRow label="Ellipse" keys={["O", "4"]} />
            <ShortcutRow label="Eraser" keys={["E", "0"]} />
            <ShortcutRow label="Frame" keys={["F"]} />
            <ShortcutRow label="Insert image" keys={["9"]} />
            <ShortcutRow label="Keep tool active after drawing" keys={["Q"]} />
          </Section>

          {/* Canvas — Edit */}
          <Section title="Canvas — Edit">
            <ShortcutRow label="Undo" keys={[["⌘", "Z"]]} />
            <ShortcutRow label="Redo" keys={[["⌘", "⇧", "Z"]]} />
            <ShortcutRow label="Cut" keys={[["⌘", "X"]]} />
            <ShortcutRow label="Copy" keys={[["⌘", "C"]]} />
            <ShortcutRow label="Paste" keys={[["⌘", "V"]]} />
            <ShortcutRow label="Delete" keys={["⌫"]} />
            <ShortcutRow label="Duplicate" keys={[["⌘", "D"]]} />
            <ShortcutRow label="Bring to front" keys={[["⌘", "⌥", "]"]]} />
            <ShortcutRow label="Send to back" keys={[["⌘", "⌥", "["]]} />
            <ShortcutRow label="Group" keys={[["⌘", "G"]]} />
            <ShortcutRow label="Edit text / label" keys={["↵"]} />
            <ShortcutRow label="Double-click bead" keys={["Open detail page"]} />
          </Section>

          {/* Canvas — Arrange */}
          <Section title="Canvas — Arrange">
            <ShortcutRow label="Align top" keys={[["⌘", "⇧", "↑"]]} />
            <ShortcutRow label="Align bottom" keys={[["⌘", "⇧", "↓"]]} />
            <ShortcutRow label="Align left" keys={[["⌘", "⇧", "←"]]} />
            <ShortcutRow label="Copy styles" keys={[["⌘", "⌥", "C"]]} />
            <ShortcutRow label="Paste styles" keys={[["⌘", "⌥", "V"]]} />
          </Section>
        </div>
      </div>
    </div>
  );
}
