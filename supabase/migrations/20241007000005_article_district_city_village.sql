-- Migration: Add district, city, village text columns to articles table
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS village text;

-- Create indexes for text filtering
CREATE INDEX IF NOT EXISTS articles_district_idx ON public.articles(district);
CREATE INDEX IF NOT EXISTS articles_city_text_idx ON public.articles(city);
CREATE INDEX IF NOT EXISTS articles_village_text_idx ON public.articles(village);
