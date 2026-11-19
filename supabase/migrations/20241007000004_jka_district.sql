-- Migration: Add district column to jan_ki_awaaz_posts and update jka_public view
ALTER TABLE public.jan_ki_awaaz_posts ADD COLUMN IF NOT EXISTS district text;

-- Drop existing view to prevent column-order rename conflicts
DROP VIEW IF EXISTS public.jka_public CASCADE;

-- Recreate jka_public view including district
CREATE VIEW public.jka_public AS
SELECT
  p.id,
  p.title,
  p.description,
  p.category,
  p.area,
  p.district,
  p.photo_url,
  p.video_url,
  p.is_featured,
  p.status,
  p.town_id,
  p.created_at,
  p.updated_at,
  CASE WHEN p.is_anonymous THEN NULL ELSE p.reporter_name END AS reporter_name
FROM public.jan_ki_awaaz_posts p
WHERE p.status::text IN ('approved', 'forwarded', 'in_progress', 'resolved');

-- Grant select permission to public roles
GRANT SELECT ON public.jka_public TO anon, authenticated;
