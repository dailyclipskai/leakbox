import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { Check, X, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends — LeakBox" },
      { name: "description", content: "Manage your LeakBox friends and pending requests." },
      { property: "og:title", content: "Friends — LeakBox" },
      { property: "og:description", content: "Manage your LeakBox friends and pending requests." },
    ],
  }),
  component: Friends,
});

type Row = { id: string; requester_id: string; addressee_id: string; status: string; profile: { id: string; username: string; display_name: string; verified: boolean; profile_picture: string | null } };

function Friends() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"friends" | "pending">("friends");
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    if (!session?.user) return;
    const uid = session.user.id;
    const { data } = await supabase.from("friendships").select("*").or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
    const other = (data ?? []).map((f) => (f.requester_id === uid ? f.addressee_id : f.requester_id));
    const { data: profs } = await supabase.from("profiles").select("id, username, display_name, verified, profile_picture").in("id", other.length ? other : ["00000000-0000-0000-0000-000000000000"]);
    const merged: Row[] = (data ?? []).map((f) => ({ ...f, profile: (profs ?? []).find((p) => p.id === (f.requester_id === uid ? f.addressee_id : f.requester_id))! })).filter((r) => r.profile);
    setRows(merged);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session?.user?.id]);

  if (!session) return <div className="max-w-md mx-auto glass p-8 mt-8 text-center">Sign in to see friends.</div>;

  const friends = (rows ?? []).filter((r) => r.status === "accepted");
  const incoming = (rows ?? []).filter((r) => r.status === "pending" && r.addressee_id === session.user.id);
  const outgoing = (rows ?? []).filter((r) => r.status === "pending" && r.requester_id === session.user.id);

  async function respond(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Friend added." : "Rejected.");
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-horror text-3xl text-primary red-glow">Friends</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("friends")} className={`px-3 py-1.5 rounded-md text-sm border ${tab === "friends" ? "border-primary bg-primary/25 red-glow" : "border-primary/25 text-muted-foreground"}`}>Friends ({friends.length})</button>
        <button onClick={() => setTab("pending")} className={`px-3 py-1.5 rounded-md text-sm border ${tab === "pending" ? "border-primary bg-primary/25 red-glow" : "border-primary/25 text-muted-foreground"}`}>Pending ({incoming.length + outgoing.length})</button>
      </div>
      {rows === null ? <div className="skeleton h-24" /> : (
        <div className="space-y-2">
          {tab === "friends" && friends.map((r) => (
            <div key={r.id} className="glass p-3 flex items-center gap-3">
              <Avatar p={r.profile} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 truncate">{r.profile.display_name}{r.profile.verified && <VerifiedBadge size={12} />}</div>
                <div className="text-xs text-muted-foreground">@{r.profile.username}</div>
              </div>
              <Link to="/messages/$userId" params={{ userId: r.profile.id }} className="btn-ghost text-xs"><MessageCircle size={14} /> Message</Link>
            </div>
          ))}
          {tab === "friends" && friends.length === 0 && <div className="glass p-6 text-center text-muted-foreground">No friends yet.</div>}
          {tab === "pending" && (
            <>
              {incoming.map((r) => (
                <div key={r.id} className="glass p-3 flex items-center gap-3">
                  <Avatar p={r.profile} />
                  <div className="flex-1 min-w-0"><div className="truncate">{r.profile.display_name}</div><div className="text-xs text-muted-foreground">wants to be your friend</div></div>
                  <button onClick={() => respond(r.id, "accepted")} className="btn-red !p-2"><Check size={14} /></button>
                  <button onClick={() => respond(r.id, "rejected")} className="btn-ghost !p-2"><X size={14} /></button>
                </div>
              ))}
              {outgoing.map((r) => (
                <div key={r.id} className="glass p-3 flex items-center gap-3 opacity-70">
                  <Avatar p={r.profile} />
                  <div className="flex-1"><div className="truncate">{r.profile.display_name}</div><div className="text-xs text-muted-foreground">pending your request</div></div>
                </div>
              ))}
              {incoming.length + outgoing.length === 0 && <div className="glass p-6 text-center text-muted-foreground">No pending requests.</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ p }: { p: Row["profile"] }) {
  return (
    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
      {p.profile_picture ? <img src={p.profile_picture} alt="" className="w-full h-full object-cover" /> : p.username[0]?.toUpperCase()}
    </div>
  );
}