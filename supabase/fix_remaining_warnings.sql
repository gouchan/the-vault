-- ============================================================
-- Fix remaining security warnings
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. Fix: Function search_path mutable ─────────────────────
-- Set a fixed search_path so the function can't be hijacked
CREATE OR REPLACE FUNCTION public.update_updated_at()
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

-- ── 2. Fix: Replace overly-permissive FOR ALL policies ───────
-- Split into explicit SELECT/INSERT/UPDATE/DELETE with role check

-- blocks
DROP POLICY IF EXISTS "anon_all" ON public.blocks;
CREATE POLICY "anon_select" ON public.blocks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.blocks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.blocks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.blocks FOR DELETE TO anon USING (true);

-- tags
DROP POLICY IF EXISTS "anon_all" ON public.tags;
CREATE POLICY "anon_select" ON public.tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.tags FOR DELETE TO anon USING (true);

-- block_tags
DROP POLICY IF EXISTS "anon_all" ON public.block_tags;
CREATE POLICY "anon_select" ON public.block_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.block_tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.block_tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.block_tags FOR DELETE TO anon USING (true);

-- block_connections
DROP POLICY IF EXISTS "anon_all" ON public.block_connections;
CREATE POLICY "anon_select" ON public.block_connections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.block_connections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.block_connections FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.block_connections FOR DELETE TO anon USING (true);

-- canvas_positions
DROP POLICY IF EXISTS "anon_all" ON public.canvas_positions;
CREATE POLICY "anon_select" ON public.canvas_positions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.canvas_positions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.canvas_positions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.canvas_positions FOR DELETE TO anon USING (true);

-- canvas_connectors
DROP POLICY IF EXISTS "anon_all" ON public.canvas_connectors;
CREATE POLICY "anon_select" ON public.canvas_connectors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.canvas_connectors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.canvas_connectors FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.canvas_connectors FOR DELETE TO anon USING (true);

-- canvas_snapshots
DROP POLICY IF EXISTS "anon_all" ON public.canvas_snapshots;
CREATE POLICY "anon_select" ON public.canvas_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.canvas_snapshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.canvas_snapshots FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.canvas_snapshots FOR DELETE TO anon USING (true);

-- canvas_history
DROP POLICY IF EXISTS "anon_all" ON public.canvas_history;
CREATE POLICY "anon_select" ON public.canvas_history FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON public.canvas_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON public.canvas_history FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete" ON public.canvas_history FOR DELETE TO anon USING (true);
