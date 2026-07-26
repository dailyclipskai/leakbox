import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LeakBox" },
      { name: "description", content: "Admin control panel." },
      { property: "og:title", content: "Admin — LeakBox" },
      { property: "og:description", content: "Admin control panel." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  const [reqs, setReqs] = useState<Array<{ id: string; user_id: string; created_at: string; profile: { username: string; display_name: string } }>>([]);
  const [pendingBoxes, setPendingBoxes] = useState<Array<{ id: string; name: string; profiles: { username: string } | null }>>([]);

  async function load() {
    const { data: vr } = await supabase.from("verification_requests").select("*").eq("status", "pending");
    const ids = (vr ?? []).map((r) => r.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, username, display_name").in("id", ids) : { data: [] as { id: string; username: string; display_name: string }[] };
    setReqs((vr ?? []).map((r) => ({ ...r, profile: (profs ?? []).find((p) => p.id === r.user_id)! })).filter((r) => r.profile));
    const { data: bx } = await supabase.from("boxes").select("id, name, verified, profiles:profiles!boxes_author_id_fkey(username)").eq("verified", false).order("created_at", { ascending: false }).limit(30);
    setPendingBoxes((bx as unknown as typeof pendingBoxes) ?? []);
  }
  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin]);

  if (loading) return <div className="p-6"><div className="skeleton h-40 max-w-2xl mx-auto" /></div>;
  if (!isAdmin) return <div className="max-w-md mx-auto glass p-8 mt-8 text-center">Admins only.</div>;

  async function approve(id: string, user_id: string, approve: boolean) {
    await supabase.from("verification_requests").update({ status: approve ? "approved" : "denied", resolved_at: new Date().toISOString() }).eq("id", id);
    if (approve) await supabase.from("profiles").update({ verified: true }).eq("id", user_id);
    await supabase.from("notifications").insert({ user_id, type: approve ? "verification_approved" : "verification_denied", payload: {} });
    toast.success(approve ? "Approved." : "Denied.");
    load();
  }
  async function verifyBox(id: string) {
    await supabase.from("boxes").update({ verified: true }).eq("id", id);
    toast.success("Box verified.");
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-horror text-3xl text-primary red-glow flex items-center gap-2"><ShieldCheck /> Admin Panel</h1>

      <section className="glass p-5 space-y-3">
        <h2 className="font-horror text-xl text-primary">Verification requests</h2>
        {reqs.length === 0 ? <div className="text-sm text-muted-foreground">No pending requests.</div> : reqs.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-t border-primary/20 pt-3">
            <div className="flex-1">
              <div>{r.profile.display_name}</div>
              <div className="text-xs text-muted-foreground">@{r.profile.username} · {new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            <button className="btn-red text-xs" onClick={() => approve(r.id, r.user_id, true)}>Approve</button>
            <button className="btn-ghost text-xs" onClick={() => approve(r.id, r.user_id, false)}>Deny</button>
          </div>
        ))}
      </section>

      <section className="glass p-5 space-y-3">
        <h2 className="font-horror text-xl text-primary">Recent unverified boxes</h2>
        {pendingBoxes.length === 0 ? <div className="text-sm text-muted-foreground">Nothing to verify.</div> : pendingBoxes.map((b) => (
          <div key={b.id} className="flex items-center gap-3 border-t border-primary/20 pt-3">
            <div className="flex-1 min-w-0"><Link to="/box/$id" params={{ id: b.id }} className="hover:text-primary truncate block">{b.name}</Link><div className="text-xs text-muted-foreground">@{b.profiles?.username}</div></div>
            <button className="btn-red text-xs" onClick={() => verifyBox(b.id)}>Verify</button>
          </div>
        ))}
      </section>
    </div>
  );
}