"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ConnectorPreviewData, ConnectorPreviewField } from "@/lib/actions/connectors";

interface ConnectorPreviewSheetProps {
  preview: ConnectorPreviewData;
  onSync: (selectedFields: string[], syncTags: boolean) => void;
  onSkip: () => void;
}

export function ConnectorPreviewSheet({ preview, onSync, onSkip }: ConnectorPreviewSheetProps) {
  const transferable = preview.fields.filter((f) => f.canTransfer);
  const blocked = preview.fields.filter((f) => !f.canTransfer && f.sourceValue);

  const [selected, setSelected] = useState<Set<string>>(new Set(transferable.map((f) => f.key)));
  const [syncTags, setSyncTags] = useState(preview.tagCount > 0);

  const nothingToTransfer = transferable.length === 0 && preview.tagCount === 0;
  const hasSelection = selected.size > 0 || syncTags;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function truncate(s: string | null, max = 48) {
    if (!s) return "";
    return s.length > max ? s.slice(0, max) + "…" : s;
  }

  return (
    <div className="w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl animate-in fade-in zoom-in-95 duration-150">

      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--foreground)] truncate max-w-[95px]">
          {preview.fromTitle}
        </span>
        <ArrowRight className="h-3 w-3 flex-shrink-0 text-[var(--sticky-yellow)]" />
        <span className="text-xs font-medium text-[var(--foreground)] truncate max-w-[95px]">
          {preview.toTitle}
        </span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Sync?
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {nothingToTransfer ? (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-2 italic">
            Nothing to transfer — no shared empty fields.
          </p>
        ) : (
          <>
            {/* Transferable fields */}
            {transferable.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                checked={selected.has(field.key)}
                onToggle={() => toggle(field.key)}
                truncate={truncate}
              />
            ))}

            {/* Tags */}
            {preview.tagCount > 0 && (
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setSyncTags((v) => !v)}
              >
                <Checkbox checked={syncTags} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[var(--foreground)]">Tags</span>
                  <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">
                    +{preview.tagCount} new tag{preview.tagCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Blocked fields (target already has a value) */}
            {blocked.length > 0 && (
              <div className="pt-2 mt-1 border-t border-[var(--border)] space-y-1.5">
                {blocked.map((field) => (
                  <div key={field.key} className="flex items-start gap-2.5 opacity-35">
                    <Minus className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[var(--muted-foreground)]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[var(--muted-foreground)]">{field.label}</span>
                      <span className="ml-2 text-[10px] text-[var(--muted-foreground)]">
                        target already has a value
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onSkip}
          className="flex-1 text-xs py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => onSync(Array.from(selected), syncTags)}
          disabled={nothingToTransfer || !hasSelection}
          className={cn(
            "flex-1 text-xs py-1.5 rounded-md font-medium transition-colors",
            !nothingToTransfer && hasSelection
              ? "bg-[var(--sticky-yellow)] text-[var(--sticky-yellow-fg)] hover:bg-[var(--sticky-yellow-dark)]"
              : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed opacity-50"
          )}
        >
          Sync →
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function FieldRow({
  field,
  checked,
  onToggle,
  truncate,
}: {
  field: ConnectorPreviewField;
  checked: boolean;
  onToggle: () => void;
  truncate: (s: string | null) => string;
}) {
  return (
    <div className="flex items-start gap-2.5 cursor-pointer" onClick={onToggle}>
      <Checkbox checked={checked} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-[var(--foreground)]">{field.label}</span>
        {field.sourceValue && (
          <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">
            {truncate(field.sourceValue)}
          </p>
        )}
      </div>
    </div>
  );
}

function Checkbox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "h-3.5 w-3.5 flex-shrink-0 rounded border transition-all flex items-center justify-center",
        checked
          ? "bg-[var(--sticky-yellow)] border-[var(--sticky-yellow)]"
          : "border-[var(--border)] bg-transparent",
        className
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-[var(--sticky-yellow-fg)]" strokeWidth={3} />}
    </div>
  );
}
