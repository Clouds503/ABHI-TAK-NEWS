-- 20241007000010_article_multi_categories.sql
-- Add category_ids text[] column to articles table to support multiple categories per news article

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT '{}'::text[];

-- Create GIN index for fast search/filtering across multiple category tags
CREATE INDEX IF NOT EXISTS articles_category_ids_gin_idx
  ON public.articles USING GIN (category_ids);

-- Backfill category_ids from existing category_id for backward compatibility
UPDATE public.articles
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL AND (category_ids IS NULL OR category_ids = '{}'::text[]);
