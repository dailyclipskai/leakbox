ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'LeakBox',
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT 'oklch(0.09 0 0)',
  ADD COLUMN IF NOT EXISTS surface_color TEXT NOT NULL DEFAULT 'oklch(0.14 0 0)',
  ADD COLUMN IF NOT EXISTS foreground_color TEXT NOT NULL DEFAULT 'oklch(0.97 0 0)',
  ADD COLUMN IF NOT EXISTS muted_color TEXT NOT NULL DEFAULT 'oklch(0.62 0 0)',
  ADD COLUMN IF NOT EXISTS border_color TEXT NOT NULL DEFAULT 'oklch(0.28 0 0)';

UPDATE public.site_settings SET primary_color = 'oklch(0.97 0 0)' WHERE id = 1 AND primary_color = 'oklch(0.52 0.22 25)';

ALTER TABLE public.messages REPLICA IDENTITY FULL;