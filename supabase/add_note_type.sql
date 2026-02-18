-- ============================================================
-- Add 'note' to block type CHECK constraint
-- Run this in your Supabase SQL Editor
-- ============================================================
-- This keeps 'prompt' as valid (for backward compat with existing data)
-- and adds 'note' as the new type. Existing 'prompt' blocks still work.
-- ============================================================

-- Drop the old constraint
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_type_check;

-- Add the new one with 'note' included
ALTER TABLE public.blocks ADD CONSTRAINT blocks_type_check
  CHECK (type IN ('person', 'reference', 'note', 'prompt', 'board'));

-- Optionally migrate existing 'prompt' blocks to 'note'
-- Uncomment the line below if you want to convert all existing prompts to notes:
-- UPDATE public.blocks SET type = 'note' WHERE type = 'prompt';
