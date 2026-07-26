
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.friend_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.verify_status AS ENUM ('pending', 'approved', 'denied');

-- user_roles first (no dependencies)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  birthday DATE,
  profile_picture TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  bio TEXT,
  join_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_post_at TIMESTAMPTZ
);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));
CREATE INDEX profiles_display_idx ON public.profiles (lower(display_name));
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin());

-- boxes
CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  discord_id TEXT,
  phone TEXT,
  gmail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX boxes_created_idx ON public.boxes (created_at DESC);
CREATE INDEX boxes_views_idx ON public.boxes (views DESC);
CREATE INDEX boxes_author_idx ON public.boxes (author_id);
GRANT SELECT ON public.boxes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.boxes TO authenticated;
GRANT ALL ON public.boxes TO service_role;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boxes_public_read" ON public.boxes FOR SELECT USING (true);
CREATE POLICY "boxes_owner_insert" ON public.boxes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "boxes_owner_update" ON public.boxes FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin());
CREATE POLICY "boxes_owner_delete" ON public.boxes FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin());

CREATE TABLE public.box_views (
  box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (box_id, viewer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.box_views TO authenticated;
GRANT ALL ON public.box_views TO service_role;
ALTER TABLE public.box_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "box_views_self" ON public.box_views FOR ALL TO authenticated USING (viewer_id = auth.uid()) WITH CHECK (viewer_id = auth.uid());

CREATE TABLE public.box_likes (
  box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (box_id, user_id)
);
GRANT SELECT ON public.box_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.box_likes TO authenticated;
GRANT ALL ON public.box_likes TO service_role;
ALTER TABLE public.box_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "box_likes_read" ON public.box_likes FOR SELECT USING (true);
CREATE POLICY "box_likes_insert" ON public.box_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "box_likes_delete" ON public.box_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friend_read" ON public.friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friend_insert" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friend_update" ON public.friendships FOR UPDATE TO authenticated USING (addressee_id = auth.uid() OR requester_id = auth.uid());
CREATE POLICY "friend_delete" ON public.friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages (sender_id, recipient_id, created_at);
CREATE INDEX messages_recipient_idx ON public.messages (recipient_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_read" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status verify_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr_read" ON public.verification_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "vr_insert" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "vr_update" ON public.verification_requests FOR UPDATE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname TEXT;
  dname TEXT;
  bday DATE;
BEGIN
  uname := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  dname := coalesce(NEW.raw_user_meta_data->>'display_name', uname);
  bday := NULLIF(NEW.raw_user_meta_data->>'birthday','')::date;
  INSERT INTO public.profiles (id, username, display_name, birthday) VALUES (NEW.id, uname, dname, bday) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF uname = 'leak' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET verified = TRUE WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.increment_box_views(_box_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v INTEGER;
BEGIN UPDATE public.boxes SET views = views + 1 WHERE id = _box_id RETURNING views INTO v; RETURN v; END; $$;

CREATE OR REPLACE FUNCTION public.recount_box_likes(_box_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.boxes SET likes = (SELECT COUNT(*) FROM public.box_likes WHERE box_id = _box_id) WHERE id = _box_id;
$$;

CREATE OR REPLACE FUNCTION public.on_box_like_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.recount_box_likes(NEW.box_id);
  ELSIF TG_OP = 'DELETE' THEN PERFORM public.recount_box_likes(OLD.box_id); END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER box_likes_recount AFTER INSERT OR DELETE ON public.box_likes FOR EACH ROW EXECUTE FUNCTION public.on_box_like_change();
