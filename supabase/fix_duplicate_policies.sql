-- ============================================================
-- Fix: Remove duplicate RLS policies, keep one per table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop ALL existing policies first
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

-- Re-create one clean policy per table
CREATE POLICY "anon_all" ON public.blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.block_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.block_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_connectors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.canvas_history FOR ALL USING (true) WITH CHECK (true);
