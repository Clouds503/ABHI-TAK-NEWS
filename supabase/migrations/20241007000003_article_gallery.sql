-- Adds gallery jsonb column to articles table to support multiple images with captions
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;
