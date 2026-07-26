import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({
    meta: [
      { title: "Post a Box — LeakBox" },
      { name: "description", content: "Share a new community box on LeakBox." },
      { property: "og:title", content: "Post a Box — LeakBox" },
      { property: "og:description", content: "Share a new community box on LeakBox." },
    ],
  }),
  component: PostBox,
});

function PostBox() {
  const { session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", discord_id: "", phone: "", gmail: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState<number | null>(null);

  const unlimited = isAdmin || profile?.verified;

  useEffect(() => {
    if (unlimited || !profile?.last_post_at) return;
    const left = 3 * 3600 * 1000 - (Date.now() - new Date(profile.last_post_at).getTime());
    if (left > 0) setCooldownLeft(left);
  }, [profile, unlimited]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    if (!form.name.trim()) return toast.error("Name is required.");
    if (cooldownLeft && cooldownLeft > 0) {
      const mins = Math.ceil(cooldownLeft / 60000);
      return toast.error(`Cooldown: wait ${mins} more minute${mins !== 1 ? "s" : ""}.`);
    }
    setLoading(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("boxes").upload(path, file);
        if (error) throw error;
        image_url = `boxes/${path}`;
      }
      const { data: inserted, error: insErr } = await supabase.from("boxes").insert({
        author_id: session.user.id,
        name: form.name.trim(),
        description: form.description.trim(),
        image_url,
        discord_id: form.discord_id.trim() || null,
        phone: form.phone.trim() || null,
        gmail: form.gmail.trim() || null,
      }).select("id").single();
      if (insErr) throw insErr;
      if (!unlimited) {
        await supabase.from("profiles").update({ last_post_at: new Date().toISOString() }).eq("id", session.user.id);
      }
      toast.success("Box posted.");
      navigate({ to: "/box/$id", params: { id: inserted.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-horror text-3xl text-primary red-glow mb-1">Post a Box</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {unlimited ? "You have unlimited posting." : "Normal users can post 1 box every 3 hours."}
      </p>
      {cooldownLeft !== null && cooldownLeft > 0 && (
        <div className="glass p-3 mb-4 text-sm text-primary">
          Cooldown: {Math.ceil(cooldownLeft / 60000)} minutes remaining
        </div>
      )}
      <form onSubmit={submit} className="glass p-6 space-y-4 fade-in">
        <div>
          <label className="text-xs text-muted-foreground">Name</label>
          <input className="leak-input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description</label>
          <textarea className="leak-input mt-1 min-h-32" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Image</label>
          <label className="mt-1 flex items-center justify-center gap-2 border border-dashed border-primary/40 rounded-md p-6 cursor-pointer hover:border-primary transition-colors">
            <Upload size={16} />
            <span className="text-sm">{file ? file.name : "Click to upload"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) { const url = URL.createObjectURL(f); setPreview(url); }
            }} />
          </label>
          {preview && <img src={preview} alt="preview" className="mt-2 max-h-60 rounded-md border border-primary/30" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Discord User ID (optional)</label>
            <input className="leak-input mt-1" value={form.discord_id} onChange={(e) => setForm({ ...form, discord_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone (optional)</label>
            <input className="leak-input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Gmail (optional)</label>
            <input className="leak-input mt-1" value={form.gmail} onChange={(e) => setForm({ ...form, gmail: e.target.value })} />
          </div>
        </div>
        <button className="btn-red w-full pulse-red" disabled={loading}>{loading ? "Posting..." : "Post Box"}</button>
      </form>
    </div>
  );
}