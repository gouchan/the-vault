"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tag } from "@/types/block";
import { addTagToBlock, removeTagFromBlock, searchTags } from "@/lib/actions/tags";
import { cn } from "@/lib/utils/cn";

interface TagInputProps {
  blockId: string;
  tags: Tag[];
  onTagsChanged: () => void;
}

function TagPill({
  tag,
  onRemove,
}: {
  tag: Tag;
  onRemove: () => void;
}) {
  const hasColor = Boolean(tag.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none",
        !hasColor && "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
      )}
      style={
        hasColor
          ? { backgroundColor: tag.color!, color: "var(--foreground)" }
          : undefined
      }
    >
      {tag.name}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove tag ${tag.name}`}
        className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          fill="currentColor"
          className="h-2.5 w-2.5"
          aria-hidden="true"
        >
          <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L6 4.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L7.06 6l2.72 2.72a.75.75 0 1 1-1.06 1.06L6 7.06 3.28 9.78a.75.75 0 0 1-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </span>
  );
}

export function TagInput({ blockId, tags, onTagsChanged }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchTags(trimmed);
        // Filter out already-attached tags
        const currentIds = new Set(tags.map((t) => t.id));
        setSuggestions(results.filter((r) => !currentIds.has(r.id)));
        setShowDropdown(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, tags]);

  const commitTag = useCallback(
    async (nameOrTag: string | Tag) => {
      const name =
        typeof nameOrTag === "string" ? nameOrTag.trim() : nameOrTag.name;
      if (!name) return;

      // Avoid duplicate names already on the block
      if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        setInputValue("");
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      try {
        await addTagToBlock(blockId, name);
        onTagsChanged();
      } catch (err) {
        console.error("Failed to add tag:", err);
      } finally {
        setInputValue("");
        setSuggestions([]);
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    },
    [blockId, tags, onTagsChanged]
  );

  const handleRemove = useCallback(
    async (tagId: string) => {
      try {
        await removeTagFromBlock(blockId, tagId);
        onTagsChanged();
      } catch (err) {
        console.error("Failed to remove tag:", err);
      }
    },
    [blockId, onTagsChanged]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          commitTag(suggestions[activeIndex]);
        } else {
          commitTag(inputValue);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === "Escape") {
        setShowDropdown(false);
        setActiveIndex(-1);
        return;
      }

      // Backspace on empty input removes last tag
      if (
        e.key === "Backspace" &&
        inputValue === "" &&
        tags.length > 0
      ) {
        e.preventDefault();
        const lastTag = tags[tags.length - 1];
        handleRemove(lastTag.id);
      }
    },
    [activeIndex, suggestions, inputValue, tags, commitTag, handleRemove]
  );

  const handleBlur = useCallback(() => {
    // Delay so mousedown on a suggestion can fire first
    setTimeout(() => {
      setShowDropdown(false);
      setActiveIndex(-1);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  }, [suggestions]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Tag pills + input row */}
      <div
        className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--input)] bg-transparent px-2 py-1.5 focus-within:ring-1 focus-within:ring-[var(--ring)] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            onRemove={() => handleRemove(tag.id)}
          />
        ))}

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          aria-label="Add tag"
          className={cn(
            "min-w-[6rem] flex-1 bg-transparent text-xs text-[var(--foreground)]",
            "placeholder:text-[var(--muted-foreground)]",
            "focus:outline-none"
          )}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && (suggestions.length > 0 || loading) && (
        <ul
          role="listbox"
          aria-label="Tag suggestions"
          className={cn(
            "absolute left-0 z-50 mt-1 w-full overflow-hidden rounded-md border border-[var(--border)]",
            "bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md"
          )}
        >
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
              Searching…
            </li>
          )}
          {suggestions.map((tag, i) => (
            <li
              key={tag.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focused
                commitTag(tag);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs",
                i === activeIndex
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              )}
            >
              {/* Color swatch */}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: tag.color ?? "var(--secondary)",
                }}
              />
              {tag.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
