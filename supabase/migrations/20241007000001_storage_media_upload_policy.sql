-- =============================================================================
-- Migration: 20241007000001_storage_media_upload_policy.sql
-- Fixes: RLS policy on storage.objects for 'media' bucket to ensure user & admin
-- image uploads never fail with "new row violates row-level security policy".
-- =============================================================================

-- Ensure media bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow INSERT to media bucket for all roles (anon & authenticated)
DROP POLICY IF EXISTS "media_allow_all_upload" ON storage.objects;
CREATE POLICY "media_allow_all_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media');

-- Allow UPDATE to media bucket for all roles (to support upsert)
DROP POLICY IF EXISTS "media_allow_all_update" ON storage.objects;
CREATE POLICY "media_allow_all_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media');
