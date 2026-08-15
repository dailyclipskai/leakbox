ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE public.box_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.box_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX box_comments_box_idx ON public.box_comments(box_id, created_at);

GRANT SELECT ON public.box_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.box_comments TO authenticated;
GRANT ALL ON public.box_comments TO service_role;

ALTER TABLE public.box_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read" ON public.box_comments FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_id AND (b.visibility = 'public' OR b.author_id = auth.uid() OR public.is_admin())));

CREATE POLICY "comments_insert" ON public.box_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_id AND b.comments_enabled AND (b.visibility = 'public' OR b.author_id = auth.uid())));

CREATE POLICY "comments_update_own" ON public.box_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_delete" ON public.box_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_id AND b.author_id = auth.uid()));

CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.box_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_read" ON public.comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "comment_likes_insert" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comment_likes_delete" ON public.comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.on_comment_like_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.box_comments SET likes = likes + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.box_comments SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER comment_likes_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.on_comment_like_change();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER box_comments_updated_at BEFORE UPDATE ON public.box_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.box_guest_views (
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  token text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (box_id, token)
);
GRANT ALL ON public.box_guest_views TO service_role;
ALTER TABLE public.box_guest_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_box_views_guest(_box_id uuid, _token text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN
    RETURN (SELECT views FROM public.boxes WHERE id = _box_id);
  END IF;
  INSERT INTO public.box_guest_views(box_id, token) VALUES (_box_id, _token)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN (SELECT views FROM public.boxes WHERE id = _box_id);
  END IF;
  UPDATE public.boxes SET views = views + 1 WHERE id = _box_id RETURNING views INTO v;
  RETURN v;
END; $$;

REVOKE ALL ON FUNCTION public.increment_box_views_guest(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_box_views_guest(uuid, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_box_views(uuid) FROM anon;