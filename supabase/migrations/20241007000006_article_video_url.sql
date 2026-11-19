-- Migration: Add video_url column to articles table
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS video_url text;

CREATE INDEX IF NOT EXISTS articles_video_url_idx ON public.articles(video_url);
