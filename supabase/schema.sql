-- The Vault - Database Schema
-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Blocks table - universal content unit
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('person', 'reference', 'prompt', 'board')),

  -- Common fields
  title TEXT,
  description TEXT,

  -- Person-specific
  role TEXT,
  portfolio_url TEXT,
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  avatar_url TEXT,

  -- Reference-specific
  url TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,

  -- Prompt-specific
  content TEXT,

  -- Metadata
  notes TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(notes, '') || ' ' ||
      coalesce(content, '') || ' ' ||
      coalesce(role, '')
    )
  ) STORED
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block ↔ Tag
CREATE TABLE block_tags (
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (block_id, tag_id)
);

-- Block connections (board→block or block→block)
CREATE TABLE block_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  child_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  connection_type TEXT DEFAULT 'contains',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id, connection_type)
);

-- Canvas positions
CREATE TABLE canvas_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  width FLOAT DEFAULT 280,
  height FLOAT DEFAULT 200,
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, block_id)
);

-- Indexes
CREATE INDEX idx_blocks_type ON blocks(type);
CREATE INDEX idx_blocks_created ON blocks(created_at DESC);
CREATE INDEX idx_blocks_pinned ON blocks(pinned) WHERE pinned = TRUE;
CREATE INDEX idx_blocks_search ON blocks USING GIN(search_vector);
CREATE INDEX idx_connections_parent ON block_connections(parent_id);
CREATE INDEX idx_connections_child ON block_connections(child_id);
CREATE INDEX idx_canvas_board ON canvas_positions(board_id);
CREATE INDEX idx_tags_name ON tags(name);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER canvas_updated_at
  BEFORE UPDATE ON canvas_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create storage bucket (run in Supabase dashboard > Storage > New bucket)
-- Name: vault-media
-- Public: true
