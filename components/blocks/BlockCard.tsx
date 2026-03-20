"use client";

import type { Block } from "@/types/block";
import { PersonCard } from "./PersonCard";
import { ReferenceCard } from "./ReferenceCard";
import { PromptCard } from "./PromptCard";
import { NoteCard } from "./NoteCard";
import { BoardCard } from "./BoardCard";

export function BlockCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  switch (block.type) {
    case "person":
      return <PersonCard block={block} onClick={onClick} />;
    case "reference":
      return <ReferenceCard block={block} onClick={onClick} />;
    case "note":
      return <NoteCard block={block} onClick={onClick} />;
    case "prompt":
      return <PromptCard block={block} onClick={onClick} />;
    case "board":
      return <BoardCard block={block} onClick={onClick} />;
    default:
      return null;
  }
}
