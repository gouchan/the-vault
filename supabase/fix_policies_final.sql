-- ============================================================
-- FINAL FIX: Proper RLS — anon can only SELECT,
-- service_role bypasses RLS entirely (Supabase default).
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- ── 1. Fix function search_path warning ──────────────────────
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

-- ── 2. Drop ALL existing policies ────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('blocks', 'tags', 'block_tags', 'block_connections',
                        'canvas_positions', 'canvas_connectors', 'canvas_snapshots', 'canvas_history')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── 3. Ensure RLS is enabled ─────────────────────────────────
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_history ENABLE ROW LEVEL SECURITY;

-- ── 4. Anon role: SELECT only (read access for client-side) ──
-- The linter excludes SELECT + USING(true) from warnings.
-- Writes go through server actions using the service_role key,
-- which bypasses RLS entirely (Supabase default behavior).

CREATE POLICY "anon_read" ON public.blocks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.block_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.block_connections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.canvas_positions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.canvas_connectors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.canvas_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.canvas_history FOR SELECT TO anon USING (true);
