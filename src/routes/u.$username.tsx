import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BoxCard, type BoxRow } from "@/components/BoxCard";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, BadgePlus, Camera } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — LeakBox` },
      { name: "description", content: `LeakBox profile of @${params.username}.` },
      { property: "og:title", content: `@${params.username} — LeakBox` },
      { property: "og:description", content: `LeakBox profile of @${params.username}.` },
    ],
  }),
  component: Profile,
});

type P = { id: string; username: string; display_name: string; verified: boolean; join_date: string; profile_picture: string | null; bio: string | null };

function Profile() {
  const { username } = Route.useParams();
  const { session, profile: me, isAdmin, refresh } = useAuth();
  const [p, setP] = useState<P | null>(null);
  const [boxes, setBoxes] = useState<BoxRow[] | null>(null);
  const [tab, setTab] = useState<"posted" | "verified" | "private">("posted");
  const [friendCount, setFriendCount] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted" | "outgoing">("none");
  const [rank, setRank] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPfp, setUploadingPfp] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!alive) return;
      if (!prof) return setNotFound(true);
      setP(prof as P);
      const [{ data: bx }, { count }] = await Promise.all([
        supabase.from("boxes").select("*, profiles:profiles!boxes_author_id_fkey(username, display_name, verified)").eq("author_id", prof.id).order("created_at", { ascending: false }),
        supabase.from("friendships").select("id", { count: "exact", head: true }).or(`requester_id.eq.${prof.id},addressee_id.eq.${prof.id}`).eq("status", "accepted"),
      ]);
      if (!alive) return;
      setBoxes((bx as unknown as BoxRow[]) ?? []);
      setFriendCount(count ?? 0);

      // Compute verified-box rank across all authors
      const { data: allVerified } = await supabase.from("boxes").select("author_id").eq("verified", true);
      const counts = new Map<string, number>();
      (allVerified ?? []).forEach((b: { author_id: string }) => counts.set(b.author_id, (counts.get(b.author_id) ?? 0) + 1));
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const idx = ranked.findIndex(([id]) => id === prof.id);
      if (alive) setRank(idx >= 0 ? idx + 1 : null);

      if (session?.user && session.user.id !== prof.id) {
        const { data: f } = await supabase.from("friendships").select("*")
          .or(`and(requester_id.eq.${session.user.id},addressee_id.eq.${prof.id}),and(requester_id.eq.${prof.id},addressee_id.eq.${session.user.id})`)
          .maybeSingle();
        if (f) setFriendStatus(f.status === "accepted" ? "accepted" : (f.requester_id === session.user.id ? "outgoing" : "pending"));
      }
    })();
    return () => { alive = false; };
  }, [username, session?.user?.id]);

  if (notFound) return <div className="max-w-lg mx-auto glass p-10 mt-8 text-center text-muted-foreground">User not found.</div>;
  if (!p) return <div className="max-w-3xl mx-auto p-4"><div className="skeleton h-40" /></div>;

  const isMe = session?.user?.id === p.id;
  const allBoxes = boxes ?? [];
  // Non-owners cannot see private boxes anyway (RLS filters). For self view we split by visibility.
  const posted = isMe ? allBoxes.filter((b) => b.visibility !== "private") : allBoxes;
  const verified = posted.filter((b) => b.verified);
  const privateBoxes = isMe ? allBoxes.filter((b) => b.visibility === "private") : [];
  const totalViews = posted.reduce((s, b) => s + b.views, 0);
  const totalLikes = posted.reduce((s, b) => s + b.likes, 0);

  async function sendFriend() {
    if (!session?.user || !p) return;
    const { error } = await supabase.from("friendships").insert({ requester_id: session.user.id, addressee_id: p.id });
    if (error) return toast.error(error.message);
    setFriendStatus("outgoing");
    await supabase.from("notifications").insert({ user_id: p.id, type: "friend_request", payload: { from: me?.username } });
    toast.success("Request sent.");
  }

  async function requestVerification() {
    if (!me) return;
    const ageDays = (Date.now() - new Date(me.join_date).getTime()) / (24 * 3600 * 1000);
    if (ageDays < 1 || verified.length < 2) return toast.error("You do not meet the verification requirements.");
    const { error } = await supabase.from("verification_requests").insert({ user_id: me.id });
    if (error) return toast.error(error.message);
    toast.success("Verification requested.");
  }

  async function adminVerifyUser() {
    if (!p) return;
    const { error } = await supabase.from("profiles").update({ verified: !p.verified }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setP({ ...p, verified: !p.verified });
    toast.success(`User ${!p.verified ? "verified" : "unverified"}.`);
    await refresh();
  }

  async function uploadPfp(f: File) {
    if (!session?.user || !p) return;
    setUploadingPfp(true);
    try {
      const ext = f.name.split(".").pop() || "png";
      const path = `${session.user.id}/pfp-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const url = signed?.signedUrl ?? null;
      const { error } = await supabase.from("profiles").update({ profile_picture: url }).eq("id", p.id);
      if (error) throw error;
      setP({ ...p, profile_picture: url });
      await refresh();
      toast.success("Profile picture updated.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploadingPfp(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="glass p-6 flex flex-col md:flex-row items-center gap-6 fade-in">
        <div className="relative w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/60 overflow-hidden flex items-center justify-center text-3xl font-horror text-primary group">
          {p.profile_picture ? <img src={p.profile_picture} alt="" className="w-full h-full object-cover" /> : p.username[0]?.toUpperCase()}
          {isMe && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition-opacity"
                title="Change profile picture"
              >
                <Camera size={20} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPfp(f); }}
              />
            </>
          )}
          {uploadingPfp && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px]">Uploading…</div>}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-horror text-3xl text-primary red-glow flex items-center gap-2 justify-center md:justify-start">
            {p.display_name}{p.verified && <VerifiedBadge size={22} title="Verified user" />}
          </h1>
          <p className="text-muted-foreground">@{p.username}</p>
          <p className="text-xs text-muted-foreground mt-1">Joined {new Date(p.join_date).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col gap-2">
          {!isMe && session && (
            <button onClick={sendFriend} disabled={friendStatus !== "none"} className="btn-red text-xs">
              <UserPlus size={14} /> {friendStatus === "accepted" ? "Friends" : friendStatus === "outgoing" ? "Requested" : friendStatus === "pending" ? "Accept in Friends" : "Add friend"}
            </button>
          )}
          {isMe && (
            <button onClick={requestVerification} disabled={p.verified} className="btn-ghost text-xs">
              <BadgePlus size={14} /> {p.verified ? "Already verified" : "Request verification"}
            </button>
          )}
          {isAdmin && !isMe && (
            <button onClick={adminVerifyUser} className="btn-red text-xs"><ShieldCheck size={14} /> {p.verified ? "Unverify" : "Verify user"}</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Posted" value={posted.length} />
        <Stat label="Verified" value={verified.length} />
        <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
        <Stat label="Friends" value={friendCount} />
        <Stat label="Total Views" value={totalViews} />
        <Stat label="Total Likes" value={totalLikes} />
      </div>

      <div className="flex gap-2">
        {(isMe ? (["posted", "verified", "private"] as const) : (["posted", "verified"] as const)).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm capitalize border ${tab === t ? "border-primary bg-primary/25 red-glow" : "border-primary/25 text-muted-foreground"}`}>
            {t === "posted" ? "Posted" : t === "verified" ? "Verified" : `Private (${privateBoxes.length})`}
          </button>
        ))}
      </div>

      {boxes === null ? (
        <div className="skeleton h-40" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(tab === "posted" ? posted : tab === "verified" ? verified : privateBoxes).map((b) => <BoxCard key={b.id} box={b} />)}
          {(tab === "posted" ? posted : tab === "verified" ? verified : privateBoxes).length === 0 && (
            <div className="glass p-6 text-center text-muted-foreground col-span-full">No boxes yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass p-3 text-center">
      <div className="text-xl font-horror text-primary red-glow">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}