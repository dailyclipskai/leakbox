-- 1. Repoint boxes.author_id FK to profiles so PostgREST can embed profile info
ALTER TABLE public.boxes DROP CONSTRAINT IF EXISTS boxes_author_id_fkey;
ALTER TABLE public.boxes
  ADD CONSTRAINT boxes_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Hide sensitive contact columns from anon on boxes (column-level GRANTs)
REVOKE SELECT ON public.boxes FROM anon;
GRANT SELECT (id, author_id, name, description, image_url, verified, views, likes, created_at)
  ON public.boxes TO anon;
GRANT SELECT ON public.boxes TO authenticated;

-- 3. Hide birthday from anon on profiles
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, profile_picture, verified, join_date, bio, last_post_at)
  ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

-- 4. Restrict box_likes reads to authenticated
DROP POLICY IF EXISTS "box_likes_public_read" ON public.box_likes;
DROP POLICY IF EXISTS "likes_public_read" ON public.box_likes;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='box_likes' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.box_likes', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "box_likes_auth_read" ON public.box_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.box_likes FROM anon;

-- 5. Lock down internal SECURITY DEFINER helpers from direct calls
REVOKE ALL ON FUNCTION public.recount_box_likes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_box_like_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- Keep increment_box_views callable (it's meant to be invoked from the client)
GRANT EXECUTE ON FUNCTION public.increment_box_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 6. Tighten notifications insert: only the acting user, and only to targets that
--    the acting user has a relationship with (friend/message/like/etc.).
--    For simplicity, require the sender to be authenticated (was: WITH CHECK true).
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
