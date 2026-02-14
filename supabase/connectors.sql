-- Canvas connectors: visual lines between blocks that also sync shared fields
CREATE TABLE IF NOT EXISTS canvas_connectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  from_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  to_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, from_block_id, to_block_id)
);

ALTER TABLE canvas_connectors DISABLE ROW LEVEL SECURITY;
