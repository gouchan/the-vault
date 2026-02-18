-- ============================================================
-- The Vault — Complete Database Setup
-- Run this entire file in your Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Blocks: universal content unit ─────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('person', 'reference', 'note', 'prompt', 'board')),

  -- Common
  title TEXT,
  description TEXT,

  -- Person
  role TEXT,
  portfolio_url TEXT,
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  avatar_url TEXT,

  -- Reference
  url TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,

  -- Prompt
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

-- ── Tags ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Block <-> Tag junction ─────────────────────────────────
CREATE TABLE IF NOT EXISTS block_tags (
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (block_id, tag_id)
);

-- ── Block connections (parent/child, board membership) ─────
CREATE TABLE IF NOT EXISTS block_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  child_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  connection_type TEXT DEFAULT 'contains',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id, connection_type)
);

-- ── Canvas positions (legacy, kept for migration) ──────────
CREATE TABLE IF NOT EXISTS canvas_positions (
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

-- ── Canvas connectors (visual links between blocks) ────────
CREATE TABLE IF NOT EXISTS canvas_connectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  from_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  to_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, from_block_id, to_block_id)
);

-- ── Canvas snapshots (tldraw state per board) ──────────────
CREATE TABLE IF NOT EXISTS canvas_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL UNIQUE REFERENCES blocks(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Canvas history (timeline of board evolution) ───────────
CREATE TABLE IF NOT EXISTS canvas_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks(type);
CREATE INDEX IF NOT EXISTS idx_blocks_created ON blocks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_pinned ON blocks(pinned) WHERE pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_blocks_search ON blocks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_connections_parent ON block_connections(parent_id);
CREATE INDEX IF NOT EXISTS idx_connections_child ON block_connections(child_id);
CREATE INDEX IF NOT EXISTS idx_canvas_board ON canvas_positions(board_id);
CREATE INDEX IF NOT EXISTS idx_canvas_history_board ON canvas_history(board_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ── Triggers ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER canvas_updated_at
  BEFORE UPDATE ON canvas_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Enable RLS ───────────────────────────────────────────────
-- Anon role: read-only. Writes use service_role key (bypasses RLS).
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON blocks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON block_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON block_connections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON canvas_positions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON canvas_connectors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON canvas_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON canvas_history FOR SELECT TO anon USING (true);

-- ── Storage bucket for images ──────────────────────────────
-- Run this separately if the bucket doesn't exist:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('vault-images', 'vault-images', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "Public read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'vault-images');
--
-- CREATE POLICY "Allow uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'vault-images');
--
-- CREATE POLICY "Allow updates" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'vault-images');
--
-- CREATE POLICY "Allow deletes" ON storage.objects
--   FOR DELETE USING (bucket_id = 'vault-images');
