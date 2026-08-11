import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "./UsersPanel";
import { toast } from "sonner";
import { Check, X, MessageCircle } from "lucide-react";

type Row = { id: string; requester_id: string; addressee_id: string; status: string; profile: { id: string; username: string; display_name: string; verified: boolean; profile_picture: string | null } };

export function FriendsPanel() {
  const { session } = useAuth();
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

  if (!session) return <div className="glass p-6 text-center text-muted-foreground">Sign in to see your friends.</div>;

  const friends = (rows ?? []).filter((r) => r.status === "accepted");
  const incoming = (rows ?? []).filter((r) => r.status === "pending" && r.addressee_id === session.user.id);
  const outgoing = (rows ?? []).filter((r) => r.status === "pending" && r.requester_id === session.user.id);

  async function respond(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Friend added." : "Rejected.");
    load();
  }

  if (rows === null) return <div className="skeleton h-24" />;

  return (
    <div className="space-y-4">
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm text-muted-foreground">Requests</h2>
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
              <div className="flex-1"><div className="truncate">{r.profile.display_name}</div><div className="text-xs text-muted-foreground">request pending</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm text-muted-foreground">Friends ({friends.length})</h2>
        {friends.map((r) => (
          <div key={r.id} className="glass p-3 flex items-center gap-3">
            <Avatar p={r.profile} />
            <div className="flex-1 min-w-0">
              <Link to="/u/$username" params={{ username: r.profile.username }} className="flex items-center gap-1 truncate hover:underline">{r.profile.display_name}{r.profile.verified && <VerifiedBadge size={12} />}</Link>
              <div className="text-xs text-muted-foreground">@{r.profile.username}</div>
            </div>
            <Link to="/messages/$userId" params={{ userId: r.profile.id }} className="btn-ghost text-xs"><MessageCircle size={14} /> Message</Link>
          </div>
        ))}
        {friends.length === 0 && <div className="glass p-6 text-center text-muted-foreground">No friends yet.</div>}
      </div>
    </div>
  );
}
