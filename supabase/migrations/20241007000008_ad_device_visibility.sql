-- 20241007000008_ad_device_visibility.sql
-- Add device_visibility column to advertisements table: 'all', 'mobile', or 'desktop'

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS device_visibility text NOT NULL DEFAULT 'all';

-- Backfill existing rows to 'all' if null
UPDATE public.advertisements
SET device_visibility = 'all'
WHERE device_visibility IS NULL;

-- Index for fast retrieval by placement, device visibility, and active status
CREATE INDEX IF NOT EXISTS advertisements_placement_device_idx
  ON public.advertisements (placement, is_active, device_visibility);
