import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — LeakBox" },
      { name: "description", content: "Private conversations with your LeakBox friends." },
      { property: "og:title", content: "Messages — LeakBox" },
      { property: "og:description", content: "Private conversations with your LeakBox friends." },
    ],
  }),
  component: MessagesList,
});

type Row = { id: string; username: string; display_name: string; profile_picture: string | null };

function MessagesList() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const uid = session.user.id;
      const { data: fr } = await supabase.from("friendships").select("*").or(`requester_id.eq.${uid},addressee_id.eq.${uid}`).eq("status", "accepted");
      const ids = (fr ?? []).map((f) => (f.requester_id === uid ? f.addressee_id : f.requester_id));
      if (ids.length === 0) return setRows([]);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, profile_picture").in("id", ids);
      setRows((profs as Row[]) ?? []);
    })();
  }, [session?.user?.id]);
  if (!session) return <div className="max-w-md mx-auto glass p-8 mt-8 text-center">Sign in to see messages.</div>;
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <h1 className="font-horror text-3xl text-primary red-glow">Messages</h1>
      {rows === null ? <div className="skeleton h-24" /> : rows.length === 0 ? (
        <div className="glass p-6 text-center text-muted-foreground">Add friends to start chatting.</div>
      ) : rows.map((r) => (
        <Link key={(r as unknown as { id: string }).id} to="/messages/$userId" params={{ userId: (r as unknown as { id: string }).id }} className="glass neon-hover p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
            {r.profile_picture ? <img src={r.profile_picture} alt="" className="w-full h-full object-cover" /> : r.username[0]?.toUpperCase()}
          </div>
          <div><div>{r.display_name}</div><div className="text-xs text-muted-foreground">@{r.username}</div></div>
        </Link>
      ))}
    </div>
  );
}