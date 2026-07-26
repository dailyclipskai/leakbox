
ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.boxes DROP CONSTRAINT IF EXISTS boxes_visibility_check;
ALTER TABLE public.boxes ADD CONSTRAINT boxes_visibility_check CHECK (visibility IN ('public','private'));

DROP POLICY IF EXISTS boxes_public_read ON public.boxes;
CREATE POLICY boxes_read ON public.boxes
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public' OR auth.uid() = author_id OR public.is_admin());
