import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { highlight } from "@/lib/highlight";
import { Search } from "lucide-react";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — LeakBox" },
      { name: "description", content: "Find LeakBox users by name or username." },
      { property: "og:title", content: "Users — LeakBox" },
      { property: "og:description", content: "Find LeakBox users by name or username." },
    ],
  }),
  component: Users,
});

type U = { id: string; username: string; display_name: string; verified: boolean; profile_picture: string | null };

function Users() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [boxCounts, setBoxCounts] = useState<Record<string, { posted: number; verified: number }>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name, verified, profile_picture").order("join_date", { ascending: false }).limit(200);
      setUsers((data as U[]) ?? []);
      const { data: bx } = await supabase.from("boxes").select("author_id, verified");
      const counts: Record<string, { posted: number; verified: number }> = {};
      (bx ?? []).forEach((b: { author_id: string; verified: boolean }) => {
        counts[b.author_id] ??= { posted: 0, verified: 0 };
        counts[b.author_id].posted++;
        if (b.verified) counts[b.author_id].verified++;
      });
      setBoxCounts(counts);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return null;
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => u.username.toLowerCase().includes(s) || u.display_name.toLowerCase().includes(s));
  }, [users, q]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-horror text-3xl text-primary red-glow">Users</h1>
      <div className="glass p-3 flex items-center gap-2">
        <Search size={18} className="text-primary ml-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by display name or username..." className="flex-1 bg-transparent outline-none py-2 px-1 text-sm placeholder:text-muted-foreground" />
      </div>
      {filtered === null ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const c = boxCounts[u.id] ?? { posted: 0, verified: 0 };
            return (
              <Link key={u.id} to="/u/$username" params={{ username: u.username }} className="glass neon-hover flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
                  {u.profile_picture ? <img src={u.profile_picture} alt="" className="w-full h-full object-cover" /> : u.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 truncate">{highlight(u.display_name, q)}{u.verified && <VerifiedBadge size={14} />}</div>
                  <div className="text-xs text-muted-foreground truncate">@{highlight(u.username, q)}</div>
                </div>
                <div className="text-right text-xs">
                  <div><span className="text-primary font-semibold">{c.posted}</span> posted</div>
                  <div><span className="text-primary font-semibold">{c.verified}</span> verified</div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && <div className="glass p-6 text-center text-muted-foreground">No users found.</div>}
        </div>
      )}
    </div>
  );
}