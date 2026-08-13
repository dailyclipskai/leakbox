import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { toast } from "sonner";
import { ShieldCheck, Ban, Check, Palette, Image as ImageIcon } from "lucide-react";

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
  const { settings, refresh: refreshSettings } = useSiteSettings();
  const [reqs, setReqs] = useState<Array<{ id: string; user_id: string; created_at: string; profile: { username: string; display_name: string } }>>([]);
  const [pendingBoxes, setPendingBoxes] = useState<Array<{ id: string; name: string; profiles: { username: string } | null }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; username: string; display_name: string; banned: boolean; verified: boolean }>>([]);
  const [userQuery, setUserQuery] = useState("");
  const [draft, setDraft] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => { setDraft(settings); }, [settings]);

  async function load() {
    const { data: vr } = await supabase.from("verification_requests").select("*").eq("status", "pending");
    const ids = (vr ?? []).map((r) => r.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, username, display_name").in("id", ids) : { data: [] as { id: string; username: string; display_name: string }[] };
    setReqs((vr ?? []).map((r) => ({ ...r, profile: (profs ?? []).find((p) => p.id === r.user_id)! })).filter((r) => r.profile));
    const { data: bx } = await supabase.from("boxes").select("id, name, verified, profiles:profiles!boxes_author_id_fkey(username)").eq("verified", false).order("created_at", { ascending: false }).limit(30);
    setPendingBoxes((bx as unknown as typeof pendingBoxes) ?? []);
    const { data: us } = await supabase.from("profiles").select("id, username, display_name, banned, verified").order("join_date", { ascending: false }).limit(300);
    setUsers((us as typeof users) ?? []);
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

  async function toggleBan(id: string, banned: boolean) {
    const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!banned ? "User banned." : "User unbanned.");
    load();
  }

  async function saveSettings() {
    const { error } = await supabase.from("site_settings").update({
      site_name: draft.site_name.trim() || DEFAULT_SETTINGS.site_name,
      logo_url: draft.logo_url?.trim() || null,
      primary_color: draft.primary_color.trim() || DEFAULT_SETTINGS.primary_color,
      background_color: draft.background_color.trim() || DEFAULT_SETTINGS.background_color,
      surface_color: draft.surface_color.trim() || DEFAULT_SETTINGS.surface_color,
      foreground_color: draft.foreground_color.trim() || DEFAULT_SETTINGS.foreground_color,
      muted_color: draft.muted_color.trim() || DEFAULT_SETTINGS.muted_color,
      border_color: draft.border_color.trim() || DEFAULT_SETTINGS.border_color,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Site updated for everyone.");
    refreshSettings();
  }

  async function resetTheme() {
    setDraft({ ...draft, ...DEFAULT_SETTINGS, site_name: draft.site_name, logo_url: draft.logo_url });
  }

  const filteredUsers = users.filter((u) => {
    const s = userQuery.trim().toLowerCase();
    if (!s) return true;
    return u.username.toLowerCase().includes(s) || u.display_name.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-horror text-3xl flex items-center gap-2"><ShieldCheck /> Admin Panel</h1>

      <section className="glass p-5 space-y-4">
        <h2 className="font-horror text-xl flex items-center gap-2"><Palette size={18} /> Site identity & theme</h2>
        <p className="text-xs text-muted-foreground">Applied globally to every visitor in real time.</p>

        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Website name</label>
          <input value={draft.site_name} onChange={(e) => setDraft({ ...draft, site_name: e.target.value })} placeholder="Website name" className="leak-input" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Logo URL (leave empty for default)</label>
          <div className="flex gap-2 items-center">
            <ImageIcon size={16} />
            <input value={draft.logo_url ?? ""} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} placeholder="https://..." className="leak-input flex-1" />
            {draft.logo_url && <img src={draft.logo_url} alt="Logo preview" className="w-10 h-10 object-contain bg-muted rounded" />}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField label="Background" value={draft.background_color} onChange={(v) => setDraft({ ...draft, background_color: v })} />
          <ColorField label="Surface / cards" value={draft.surface_color} onChange={(v) => setDraft({ ...draft, surface_color: v })} />
          <ColorField label="Text" value={draft.foreground_color} onChange={(v) => setDraft({ ...draft, foreground_color: v })} />
          <ColorField label="Muted text" value={draft.muted_color} onChange={(v) => setDraft({ ...draft, muted_color: v })} />
          <ColorField label="Borders" value={draft.border_color} onChange={(v) => setDraft({ ...draft, border_color: v })} />
          <ColorField label="Primary / buttons" value={draft.primary_color} onChange={(v) => setDraft({ ...draft, primary_color: v })} />
        </div>

        <div className="flex gap-2">
          <button className="btn-red" onClick={saveSettings}>Save for everyone</button>
          <button className="btn-ghost" onClick={resetTheme}>Reset colors</button>
        </div>
      </section>

      <section className="glass p-5 space-y-3">
        <h2 className="font-horror text-xl">Verification requests</h2>
        {reqs.length === 0 ? <div className="text-sm text-muted-foreground">No pending requests.</div> : reqs.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-t border-border pt-3">
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
        <h2 className="font-horror text-xl">Recent unverified boxes</h2>
        {pendingBoxes.length === 0 ? <div className="text-sm text-muted-foreground">Nothing to verify.</div> : pendingBoxes.map((b) => (
          <div key={b.id} className="flex items-center gap-3 border-t border-border pt-3">
            <div className="flex-1 min-w-0"><Link to="/box/$id" params={{ id: b.id }} className="hover:text-primary truncate block">{b.name}</Link><div className="text-xs text-muted-foreground">@{b.profiles?.username}</div></div>
            <button className="btn-red text-xs" onClick={() => verifyBox(b.id)}>Verify</button>
          </div>
        ))}
      </section>

      <section className="glass p-5 space-y-3">
        <h2 className="font-horror text-xl flex items-center gap-2"><Ban size={18} /> User management</h2>
        <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search users..." className="leak-input w-full" />
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-t border-border pt-3">
              <div className="flex-1 min-w-0">
                <Link to="/u/$username" params={{ username: u.username }} className="hover:text-primary truncate block">{u.display_name}</Link>
                <div className="text-xs text-muted-foreground">@{u.username}{u.banned && <span className="ml-2 text-primary">· BANNED</span>}</div>
              </div>
              <button onClick={() => toggleBan(u.id, u.banned)} className={u.banned ? "btn-ghost text-xs" : "btn-red text-xs"}>
                {u.banned ? <><Check size={14} /> Unban</> : <><Ban size={14} /> Ban</>}
              </button>
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="text-sm text-muted-foreground">No users.</div>}
        </div>
      </section>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2 items-center">
        <span className="inline-block w-8 h-8 rounded border border-border shrink-0" style={{ background: value }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="leak-input flex-1 !py-1.5 text-xs" />
        <input type="color" onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded bg-transparent border border-border cursor-pointer shrink-0" title={`Pick ${label.toLowerCase()} color`} />
      </div>
    </div>
  );
}
