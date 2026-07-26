import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BoxCard, type BoxRow } from "./BoxCard";
import { Search } from "lucide-react";

type Filter = "recent" | "popular" | "verified";

export function BrowseFeed() {
  const [filter, setFilter] = useState<Filter>("recent");
  const [query, setQuery] = useState("");
  const [boxes, setBoxes] = useState<BoxRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    setBoxes(null);
    (async () => {
      let q = supabase
        .from("boxes")
        .select("id, name, description, image_url, verified, views, likes, created_at, author_id, discord_id, phone, gmail, profiles:profiles!boxes_author_id_fkey(username, display_name, verified)")
        .limit(60);
      if (filter === "recent") q = q.order("created_at", { ascending: false });
      if (filter === "popular") q = q.order("views", { ascending: false });
      if (filter === "verified") q = q.eq("verified", true).order("created_at", { ascending: false });
      const { data } = await q;
      if (!alive) return;
      setBoxes((data as unknown as BoxRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, [filter]);

  const filtered = useMemo(() => {
    if (!boxes) return null;
    const q = query.trim().toLowerCase();
    if (!q) return boxes;
    return boxes.filter((b) =>
      [b.name, b.description, b.discord_id, b.phone, b.gmail, b.profiles?.username, b.profiles?.display_name]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q)),
    );
  }, [boxes, query]);

  return (
    <section className="space-y-4">
      <div className="glass p-3 flex items-center gap-2">
        <Search size={18} className="text-primary ml-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything from a box, example: discord user id / phone no."
          className="flex-1 bg-transparent outline-none py-2 px-1 text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        {(["recent", "popular", "verified"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize transition-all border ${
              filter === f
                ? "border-primary bg-primary/25 text-foreground red-glow"
                : "border-primary/25 text-muted-foreground hover:text-foreground hover:border-primary/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-10 text-center text-muted-foreground">No boxes match your search.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {filtered.map((b) => <BoxCard key={b.id} box={b} query={query} />)}
        </div>
      )}
    </section>
  );
}