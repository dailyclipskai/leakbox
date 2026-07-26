import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "./VerifiedBadge";
import { Trophy } from "lucide-react";

type Row = { user_id: string; username: string; display_name: string; verified: boolean; verified_count: number; profile_picture: string | null };

export function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      // Fetch top 10 authors by verified box count.
      const { data: boxes } = await supabase
        .from("boxes")
        .select("author_id, verified")
        .eq("verified", true);
      const counts = new Map<string, number>();
      (boxes ?? []).forEach((b: { author_id: string }) => counts.set(b.author_id, (counts.get(b.author_id) ?? 0) + 1));
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (top.length === 0) { setRows([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, verified, profile_picture")
        .in("id", top.map(([id]) => id));
      const merged: Row[] = top.map(([id, count]) => {
        const p = (profs ?? []).find((x: { id: string }) => x.id === id);
        return {
          user_id: id,
          username: p?.username ?? "unknown",
          display_name: p?.display_name ?? "unknown",
          verified: !!p?.verified,
          profile_picture: p?.profile_picture ?? null,
          verified_count: count,
        };
      });
      setRows(merged);
    })();
  }, []);

  return (
    <aside className="glass p-5 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-primary" />
        <h2 className="font-horror text-xl text-primary red-glow">TOP VERIFIED BOX</h2>
      </div>
      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No verified boxes yet. Be the first.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.user_id}>
              <Link to="/u/$username" params={{ username: r.username }} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/10 transition-colors">
                <span className={`w-6 text-center font-horror text-lg ${i < 3 ? "text-primary red-glow" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 overflow-hidden flex items-center justify-center text-xs">
                  {r.profile_picture ? <img src={r.profile_picture} alt="" className="w-full h-full object-cover" /> : r.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-1">
                    {r.display_name}
                    {r.verified && <VerifiedBadge size={12} title="Verified user" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
                </div>
                <span className="text-sm text-primary font-semibold">{r.verified_count}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}