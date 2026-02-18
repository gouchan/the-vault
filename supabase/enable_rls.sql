-- ============================================================
-- Enable RLS on all public tables
-- Run this in your Supabase SQL Editor
-- ============================================================
-- Single-user app: one permissive policy per table for anon role.
-- ============================================================

-- ── Enable RLS ───────────────────────────────────────────────
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_history ENABLE ROW LEVEL SECURITY;

-- ── One policy per table ─────────────────────────────────────
CREATE POLICY "anon_all" ON public.blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.block_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.block_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_connectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_history FOR ALL USING (true) WITH CHECK (true);
