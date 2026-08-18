import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BoxImage } from "@/components/BoxImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { highlight } from "@/lib/highlight";
import { signedUrl } from "@/lib/storage";
import { Eye, Heart, Share2, Calendar, ArrowLeft, ShieldCheck, Trash2, Lock, Globe, MessageSquare, MessageSquareOff } from "lucide-react";
import { toast } from "sonner";
import { BoxComments } from "@/components/BoxComments";
import { guestToken } from "@/lib/guest-token";
import { MediaViewer, type ViewerMedia } from "@/components/MediaViewer";

type Search = { q?: string };

export const Route = createFileRoute("/box/$id")({
  validateSearch: (s: Record<string, unknown>): Search => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Box — LeakBox" },
      { name: "description", content: "View a community box on LeakBox." },
      { property: "og:title", content: "Box — LeakBox" },
      { property: "og:description", content: "View a community box on LeakBox." },
    ],
  }),
  component: BoxPage,
});

type Media = { path: string; kind: "image" | "video" };
type Box = {
  id: string; author_id: string; name: string; description: string; image_url: string | null;
  verified: boolean; views: number; likes: number; created_at: string;
  discord_id: string | null; phone: string | null; gmail: string | null;
  visibility: "public" | "private"; media: Media[] | null;
  comments_enabled: boolean;
  profiles?: { username: string; display_name: string; verified: boolean } | null;
};

function BoxPage() {
  const { id } = Route.useParams();
  const { q } = Route.useSearch();
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);
  const [liked, setLiked] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const firstMatch = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("boxes")
        .select("*, profiles:profiles!boxes_author_id_fkey(username, display_name, verified)")
        .eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data) { setNotFound(true); return; }
      setBox(data as unknown as Box);

      // record view (dedup 24h for signed-in; guests always count)
      if (session?.user) {
        const { data: existing } = await supabase
          .from("box_views")
          .select("viewed_at")
          .eq("box_id", id).eq("viewer_id", session.user.id).maybeSingle();
        const stale = !existing || (Date.now() - new Date(existing.viewed_at).getTime() > 24 * 3600 * 1000);
        if (stale) {
          await supabase.from("box_views").upsert({ box_id: id, viewer_id: session.user.id, viewed_at: new Date().toISOString() });
          await supabase.rpc("increment_box_views", { _box_id: id });
          setBox((b) => (b ? { ...b, views: b.views + 1 } : b));
        }

        const { data: like } = await supabase.from("box_likes").select("box_id").eq("box_id", id).eq("user_id", session.user.id).maybeSingle();
        setLiked(!!like);
      } else {
        // guests: one view per device per box (prevents refresh farming)
        const { data: v } = await supabase.rpc("increment_box_views_guest", { _box_id: id, _token: guestToken() });
        if (typeof v === "number") setBox((b) => (b ? { ...b, views: v } : b));
      }
    })();
    return () => { alive = false; };
  }, [id, session?.user?.id]);

  useEffect(() => {
    if (q && firstMatch.current) firstMatch.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [q, box]);

  async function toggleLike() {
    if (!session?.user) { toast.error("Login to like."); return; }
    if (!box) return;
    if (liked) {
      await supabase.from("box_likes").delete().eq("box_id", box.id).eq("user_id", session.user.id);
      setLiked(false); setBox({ ...box, likes: Math.max(0, box.likes - 1) });
    } else {
      await supabase.from("box_likes").insert({ box_id: box.id, user_id: session.user.id });
      setLiked(true); setBox({ ...box, likes: box.likes + 1 });
    }
  }

  async function adminVerify() {
    if (!box) return;
    const { error } = await supabase.from("boxes").update({ verified: !box.verified }).eq("id", box.id);
    if (error) return toast.error(error.message);
    setBox({ ...box, verified: !box.verified });
    toast.success(`Box ${!box.verified ? "verified" : "unverified"}.`);
  }

  async function toggleVisibility() {
    if (!box) return;
    const next = box.visibility === "public" ? "private" : "public";
    const { error } = await supabase.from("boxes").update({ visibility: next }).eq("id", box.id);
    if (error) return toast.error(error.message);
    setBox({ ...box, visibility: next });
    toast.success(`Box is now ${next}.`);
  }

  async function toggleComments() {
    if (!box) return;
    const next = !box.comments_enabled;
    const { error } = await supabase.from("boxes").update({ comments_enabled: next }).eq("id", box.id);
    if (error) return toast.error(error.message);
    setBox({ ...box, comments_enabled: next });
    toast.success(next ? "Comments turned on." : "Comments turned off.");
  }

  async function deleteBox() {
    if (!box) return;
    if (!confirm("Delete this box permanently?")) return;
    const { error } = await supabase.from("boxes").delete().eq("id", box.id);
    if (error) return toast.error(error.message);
    toast.success("Box deleted.");
    navigate({ to: "/" });
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied.");
    } catch { toast.error("Copy failed."); }
  };

  const hlTargets = useMemo(() => ({ q: q ?? "" }), [q]);

  if (notFound) return <div className="max-w-2xl mx-auto p-10 text-center glass mt-8"><p className="text-muted-foreground">Box not found.</p></div>;
  if (!box) return <div className="max-w-3xl mx-auto p-4"><div className="skeleton h-96" /></div>;

  const isOwner = !!session?.user && session.user.id === box.author_id;
  const canDelete = isOwner || isAdmin;
  const mediaList: Media[] = Array.isArray(box.media) ? box.media : [];
  const singleMedia = mediaList.length === 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) window.history.back(); else navigate({ to: "/browse" }); }}
        className="btn-ghost mb-4 text-xs"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div className="glass overflow-hidden fade-in">
        <div className="relative bg-black/60">
          {mediaList.length > 0 ? (
            <div className="p-2">
              <MediaViewer items={mediaList as ViewerMedia[]} />
            </div>
          ) : box.image_url ? (
            <div className="p-2">
              <MediaViewer items={[{ path: box.image_url, kind: "image" }]} />
            </div>
          ) : (
            <BoxImage path={box.image_url} alt={box.name} className="w-full max-h-[560px] object-contain" fallbackClassName="w-full h-96" />
          )}
          {box.verified && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur rounded-full p-1.5">
              <VerifiedBadge size={28} title="Verified box" />
            </div>
          )}
          {box.visibility === "private" && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-2 py-1 text-xs text-primary">
              <Lock size={12} /> Private
            </div>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="font-horror text-3xl md:text-4xl text-primary red-glow flex items-center gap-2">
              {highlight(box.name, hlTargets.q)}
              {box.verified && <VerifiedBadge size={24} title="Verified box" />}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={toggleLike} className={`btn-ghost ${liked ? "!text-primary !border-primary" : ""}`}>
                <Heart size={16} fill={liked ? "currentColor" : "none"} /> {box.likes}
              </button>
              <button onClick={share} className="btn-ghost"><Share2 size={16} /> Share</button>
              {isAdmin && (
                <button onClick={adminVerify} className="btn-red !py-1.5 !px-3 text-xs"><ShieldCheck size={14} /> {box.verified ? "Unverify" : "Verify"}</button>
              )}
              {isOwner && (
                <button onClick={toggleVisibility} className="btn-ghost text-xs">
                  {box.visibility === "public" ? <><Lock size={14} /> Make private</> : <><Globe size={14} /> Make public</>}
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={toggleComments} className="btn-ghost text-xs">
                  {box.comments_enabled ? <><MessageSquareOff size={14} /> Turn comments off</> : <><MessageSquare size={14} /> Turn comments on</>}
                </button>
              )}
              {canDelete && (
                <button onClick={deleteBox} className="btn-red !py-1.5 !px-3 text-xs"><Trash2 size={14} /> Delete</button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye size={14} /> {box.views.toLocaleString()} views</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(box.created_at).toLocaleDateString()}</span>
            <Link to="/u/$username" params={{ username: box.profiles?.username ?? "" }} className="text-foreground hover:text-primary">
              @{box.profiles?.username}{box.profiles?.verified && <VerifiedBadge size={12} className="inline ml-1" title="Verified user" />}
            </Link>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap" ref={(el) => { if (q && el && !firstMatch.current) firstMatch.current = el; }}>
            {highlight(box.description, hlTargets.q)}
          </p>

          {(box.discord_id || box.phone || box.gmail) && (
            <div className="glass-strong p-4 space-y-2 text-sm">
              <h3 className="font-horror text-primary text-lg">Metadata</h3>
              {box.discord_id && <div><span className="text-muted-foreground">Discord: </span>{highlight(box.discord_id, hlTargets.q)}</div>}
              {box.phone && <div><span className="text-muted-foreground">Phone: </span>{highlight(box.phone, hlTargets.q)}</div>}
              {box.gmail && <div><span className="text-muted-foreground">Gmail: </span>{highlight(box.gmail, hlTargets.q)}</div>}
            </div>
          )}
        </div>
      </div>
      <BoxComments boxId={box.id} boxAuthorId={box.author_id} enabled={box.comments_enabled} />
    </div>
  );
}

function MediaTile({ media, full = false }: { media: Media; full?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedUrl(media.path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [media.path]);
  if (!url) return <div className="skeleton h-64 rounded-md" />;
  if (media.kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className={`w-full rounded-md bg-black object-contain ${full ? "max-h-[70vh] min-h-[240px]" : "max-h-[560px]"}`}
      />
    );
  }
  return <img src={url} alt="" className={`w-full object-contain rounded-md bg-black ${full ? "max-h-[70vh]" : "max-h-[560px]"}`} loading="lazy" />;
}