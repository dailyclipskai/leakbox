
-- Ban flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- Global site settings (singleton row id=1)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  logo_url text,
  primary_color text NOT NULL DEFAULT 'oklch(0.52 0.22 25)',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_read ON public.site_settings;
CREATE POLICY site_settings_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Ensure anon can read public boxes and profiles (policies already permit, grant access)
GRANT SELECT ON public.boxes TO anon;
GRANT SELECT ON public.profiles TO anon;

-- Allow anonymous viewers to count views via the SECURITY DEFINER RPC
GRANT EXECUTE ON FUNCTION public.increment_box_views(uuid) TO anon, authenticated;
