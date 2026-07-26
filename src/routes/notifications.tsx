import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LeakBox" },
      { name: "description", content: "Your LeakBox notifications." },
      { property: "og:title", content: "Notifications — LeakBox" },
      { property: "og:description", content: "Your LeakBox notifications." },
    ],
  }),
  component: Notifs,
});

type N = { id: string; type: string; payload: Record<string, unknown>; read: boolean; created_at: string };

function labelFor(n: N) {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case "friend_request": return `@${p.from ?? "someone"} sent you a friend request`;
    case "friend_accepted": return `@${p.from ?? "someone"} accepted your friend request`;
    case "verification_approved": return "Your verification was approved";
    case "verification_denied": return "Your verification was denied";
    case "like": return `@${p.from ?? "someone"} liked your box`;
    default: return n.type;
  }
}

function Notifs() {
  const { session } = useAuth();
  const [rows, setRows] = useState<N[] | null>(null);
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
      setRows((data as N[]) ?? []);
      await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    })();
  }, [session?.user?.id]);
  if (!session) return <div className="max-w-md mx-auto glass p-8 mt-8 text-center">Sign in first.</div>;
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <h1 className="font-horror text-3xl text-primary red-glow flex items-center gap-2"><Bell /> Notifications</h1>
      {rows === null ? <div className="skeleton h-24" /> : rows.length === 0 ? (
        <div className="glass p-6 text-center text-muted-foreground">Nothing here.</div>
      ) : rows.map((n) => (
        <div key={n.id} className={`glass p-3 flex items-center gap-3 ${!n.read ? "border-primary" : ""}`}>
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="flex-1 text-sm">{labelFor(n)}</div>
          <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}