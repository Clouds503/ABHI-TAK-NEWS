-- =============================================================================
-- Migration: 20241007000000_site_settings.sql
-- Adds: public.site_settings table for dynamic site name, title, logo, and icon configuration
-- Sets up RLS: Public read for everyone, write/update restricted to staff
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  id            text        PRIMARY KEY DEFAULT 'current',
  site_title    text        NOT NULL DEFAULT 'Abhitak',
  site_title_hi text        NOT NULL DEFAULT 'अभी तक',
  tagline       text        DEFAULT 'Truth · Timely · Foremost',
  tagline_hi    text        DEFAULT 'सच, समय पर, सबसे पहले',
  description   text        DEFAULT 'Premier Digital Broadsheet & News Network',
  logo_url      text        NOT NULL DEFAULT '/pwa-192.png',
  icon_url      text        NOT NULL DEFAULT '/favicon.png',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for anon and authenticated users)
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (true);

-- Allow staff full access to modify site settings
DROP POLICY IF EXISTS "site_settings_staff_all" ON public.site_settings;
CREATE POLICY "site_settings_staff_all" ON public.site_settings
  FOR ALL USING (public.is_staff(auth.uid()));

-- Insert default row if not exists
INSERT INTO public.site_settings (id, site_title, site_title_hi, tagline, tagline_hi, description, logo_url, icon_url)
VALUES ('current', 'Abhitak', 'अभी तक', 'Truth · Timely · Foremost', 'सच, समय पर, सबसे पहले', 'Premier Digital Broadsheet & News Network', '/pwa-192.png', '/favicon.png')
ON CONFLICT (id) DO NOTHING;
