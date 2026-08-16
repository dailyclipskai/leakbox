import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Counters = { messages: number; requests: number; notifications: number };

export function useCounters(): Counters {
  const { session } = useAuth();
  const [c, setC] = useState<Counters>({ messages: 0, requests: 0, notifications: 0 });

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setC({ messages: 0, requests: 0, notifications: 0 }); return; }
    let alive = true;

    async function load() {
      const [m, f, n] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", uid!).eq("read", false),
        supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", uid!).eq("status", "pending"),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("read", false),
      ]);
      if (!alive) return;
      setC({ messages: m.count ?? 0, requests: f.count ?? 0, notifications: n.count ?? 0 });
    }

    load();
    const t = setInterval(load, 10000);
    // unique channel name per hook instance: several components use this hook at
    // once, and reusing one name re-subscribes an already-subscribed channel.
    const ch = supabase
      .channel(`counters:${uid}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, load)
      .subscribe();
    return () => { alive = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [session?.user?.id]);

  return c;
}
