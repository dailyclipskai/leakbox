import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "./UsersPanel";
import { Search } from "lucide-react";

type Prof = { id: string; username: string; display_name: string; profile_picture: string | null };
type Convo = { other: Prof; last: string; at: string; unread: number };

export function MessagesPanel() {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const [convos, setConvos] = useState<Convo[] | null>(null);
  const [people, setPeople] = useState<Prof[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!uid) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_id, recipient_id, content, created_at, read")
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(500);

    const map = new Map<string, { last: string; at: string; unread: number }>();
    (msgs ?? []).forEach((m) => {
      const other = m.sender_id === uid ? m.recipient_id : m.sender_id;
      const cur = map.get(other);
      if (!cur) map.set(other, { last: m.content, at: m.created_at, unread: 0 });
      const e = map.get(other)!;
      if (m.recipient_id === uid && !m.read) e.unread++;
    });

    const ids = [...map.keys()];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, username, display_name, profile_picture").in("id", ids)
      : { data: [] as Prof[] };

    setConvos(
      ids
        .map((id) => {
          const p = (profs as Prof[] | null)?.find((x) => x.id === id);
          const e = map.get(id)!;
          return p ? { other: p, ...e } : null;
        })
        .filter(Boolean) as Convo[],
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    load();
    const ch = supabase
      .channel(`convos:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 1) { setPeople([]); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, profile_picture")
        .or(`username.ilike.%${s}%,display_name.ilike.%${s}%`)
        .limit(10);
      if (alive) setPeople(((data as Prof[]) ?? []).filter((p) => p.id !== uid));
    })();
    return () => { alive = false; };
  }, [q, uid]);

  const sorted = useMemo(
    () => (convos ?? []).slice().sort((a, b) => (a.at < b.at ? 1 : -1)),
    [convos],
  );

  if (!session) return <div className="glass p-6 text-center text-muted-foreground">Sign in to use messages.</div>;

  return (
    <div className="space-y-3">
      <div className="glass p-2 flex items-center gap-2">
        <Search size={16} className="text-muted-foreground ml-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start a new chat — search anyone..." className="flex-1 bg-transparent outline-none py-2 px-1 text-sm placeholder:text-muted-foreground" />
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          {people.map((p) => (
            <Link key={p.id} to="/messages/$userId" params={{ userId: p.id }} className="glass neon-hover p-3 flex items-center gap-3">
              <Avatar p={p} size={36} />
              <div className="min-w-0"><div className="truncate text-sm">{p.display_name}</div><div className="text-xs text-muted-foreground">@{p.username}</div></div>
            </Link>
          ))}
        </div>
      )}

      {convos === null ? (
        <div className="skeleton h-24" />
      ) : sorted.length === 0 ? (
        <div className="glass p-6 text-center text-muted-foreground">No conversations yet. Search someone above to start chatting.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => (
            <Link key={c.other.id} to="/messages/$userId" params={{ userId: c.other.id }} className="glass neon-hover p-3 flex items-center gap-3">
              <Avatar p={c.other} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">{c.other.display_name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.last}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">{new Date(c.at).toLocaleDateString()}</div>
                {c.unread > 0 && (
                  <span className="mt-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{c.unread}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
