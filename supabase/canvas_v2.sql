-- Canvas snapshots: persist tldraw state per board
CREATE TABLE IF NOT EXISTS canvas_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL UNIQUE REFERENCES blocks(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE canvas_snapshots DISABLE ROW LEVEL SECURITY;

-- Canvas history: timeline of board evolution
CREATE TABLE IF NOT EXISTS canvas_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_history_board ON canvas_history(board_id, created_at);

ALTER TABLE canvas_history DISABLE ROW LEVEL SECURITY;
