"use client";

import type { Block } from "@/types/block";
import { Badge } from "@/components/ui/badge";
import { Instagram, Twitter, Linkedin, ExternalLink, User, Layers } from "lucide-react";

export function PersonCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--ring)] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {block.avatar_url ? (
          <img
            src={block.avatar_url}
            alt={block.title || ""}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)]">
            <User className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{block.title}</h3>
          {block.role && (
            <p className="text-xs text-[var(--muted-foreground)] truncate">{block.role}</p>
          )}
        </div>
      </div>

      {block.description && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)] line-clamp-2">
          {block.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {block.instagram && (
          <a
            href={`https://instagram.com/${block.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Instagram className="h-3.5 w-3.5" />
          </a>
        )}
        {block.twitter && (
          <a
            href={`https://x.com/${block.twitter.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Twitter className="h-3.5 w-3.5" />
          </a>
        )}
        {block.linkedin && (
          <a
            href={block.linkedin.startsWith("http") ? block.linkedin : `https://linkedin.com/in/${block.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Linkedin className="h-3.5 w-3.5" />
          </a>
        )}
        {block.portfolio_url && (
          <a
            href={block.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {block.tags?.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag.name}
            </Badge>
          ))}
        </div>
        {(block as any)._count?.children > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <Layers className="h-3 w-3" /> {(block as any)._count.children}
          </span>
        )}
      </div>
    </div>
  );
}
