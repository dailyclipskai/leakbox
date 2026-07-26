import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";

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
  const [form, setForm] = useState({ name: "", description: "", discord_id: "", phone: "", gmail: "", visibility: "public" as "public" | "private" });
  const [files, setFiles] = useState<File[]>([]);
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
      const media: { path: string; kind: "image" | "video" }[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "bin";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("boxes").upload(path, f);
        if (error) throw error;
        media.push({ path: `boxes/${path}`, kind: f.type.startsWith("video/") ? "video" : "image" });
      }
      const cover = media.find((m) => m.kind === "image") ?? media[0];
      const image_url = cover?.path ?? null;
      const { data: inserted, error: insErr } = await supabase.from("boxes").insert({
        author_id: session.user.id,
        name: form.name.trim(),
        description: form.description.trim(),
        image_url,
        media,
        visibility: form.visibility,
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
          <label className="text-xs text-muted-foreground">Images & videos</label>
          <label className="mt-1 flex items-center justify-center gap-2 border border-dashed border-primary/40 rounded-md p-6 cursor-pointer hover:border-primary transition-colors">
            <Upload size={16} />
            <span className="text-sm">{files.length ? `${files.length} file${files.length !== 1 ? "s" : ""} selected` : "Click to upload — images and videos"}</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
          </label>
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative border border-primary/30 rounded-md overflow-hidden bg-black/40">
                  {f.type.startsWith("video/") ? (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground"><Video size={16} className="mr-1" /> {f.name}</div>
                  ) : (
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-24 object-cover" />
                  )}
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/70 rounded-full p-1 hover:bg-primary/60">
                    <X size={12} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 text-[10px] flex items-center gap-1">
                    {f.type.startsWith("video/") ? <Video size={10} /> : <ImageIcon size={10} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Visibility</label>
          <div className="mt-1 flex gap-2">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, visibility: v })}
                className={`px-3 py-1.5 rounded-md text-sm capitalize border ${form.visibility === v ? "border-primary bg-primary/25 red-glow" : "border-primary/25 text-muted-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
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