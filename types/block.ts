export type BlockType = "person" | "reference" | "note" | "prompt" | "board";
export type MediaType = "image" | "video" | "youtube" | "vimeo" | "url" | "tweet" | "screenshot";

export interface Block {
  id: string;
  type: BlockType;

  // Common
  title: string | null;
  description: string | null;

  // Person
  role: string | null;
  portfolio_url: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  avatar_url: string | null;

  // Reference
  url: string | null;
  media_type: MediaType | null;
  thumbnail_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;

  // Note
  content: string | null;

  // Meta
  notes: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;

  // Relations (populated via joins)
  tags?: Tag[];
  children?: Block[];
  _count?: { children: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface BlockTag {
  block_id: string;
  tag_id: string;
}

export interface BlockConnection {
  id: string;
  parent_id: string;
  child_id: string;
  connection_type: "contains" | "relates_to";
  created_at: string;
}

export interface CanvasPosition {
  id: string;
  board_id: string;
  block_id: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

// Form types
export interface CreatePersonInput {
  title: string;
  role?: string;
  portfolio_url?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  avatar_url?: string;
  description?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateReferenceInput {
  title?: string;
  url?: string;
  media_type?: MediaType;
  thumbnail_url?: string;
  description?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateNoteInput {
  title: string;
  content: string;
  description?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateBoardInput {
  title: string;
  description?: string;
}
