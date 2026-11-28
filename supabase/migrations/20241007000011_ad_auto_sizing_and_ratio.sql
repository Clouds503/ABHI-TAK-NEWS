-- 20241007000011_ad_auto_sizing_and_ratio.sql
-- Add aspect_ratio and auto_sizing columns to advertisements table

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS aspect_ratio text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS auto_sizing boolean NOT NULL DEFAULT true;

-- Backfill existing rows
UPDATE public.advertisements
SET aspect_ratio = 'auto', auto_sizing = true
WHERE aspect_ratio IS NULL;

-- Index for fast retrieval by placement, aspect ratio, and active status
CREATE INDEX IF NOT EXISTS advertisements_placement_ratio_idx
  ON public.advertisements (placement, is_active, aspect_ratio);
