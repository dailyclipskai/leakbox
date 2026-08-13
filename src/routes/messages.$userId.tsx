import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/$userId")({
  head: () => ({
    meta: [
      { title: "Chat — LeakBox" },
      { name: "description", content: "Private chat on LeakBox." },
      { property: "og:title", content: "Chat — LeakBox" },
      { property: "og:description", content: "Private chat on LeakBox." },
    ],
  }),
  component: Chat,
});

type Msg = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string };
type Other = { id: string; username: string; display_name: string };

function Chat() {
  const { userId } = Route.useParams();
  const { session } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [other, setOther] = useState<Other | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("id, username, display_name").eq("id", userId).maybeSingle();
      setOther(p as Other | null);
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${uid},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${uid})`)
        .order("created_at", { ascending: true });
      setMsgs((data as Msg[]) ?? []);
      await supabase.from("messages").update({ read: true }).eq("recipient_id", uid).eq("sender_id", userId).eq("read", false);
    })();

    const channel = supabase.channel(`dm:${uid}:${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new as Msg;
      if ((m.sender_id === uid && m.recipient_id === userId) || (m.sender_id === userId && m.recipient_id === uid)) {
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.recipient_id === uid) supabase.from("messages").update({ read: true }).eq("id", m.id).then(() => {});
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, session?.user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user || !text.trim()) return;
    const content = text.trim();
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: session.user.id, recipient_id: userId, content })
      .select()
      .single();
    if (error) { setText(content); toast.error(error.message); return; }
    if (data) setMsgs((prev) => (prev.some((x) => x.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
  }

  if (!session) return <div className="max-w-md mx-auto glass p-8 mt-8 text-center">Sign in first.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="glass p-4 mb-3">
        <div className="font-horror text-xl">{other?.display_name ?? "..."}</div>
        <div className="text-xs text-muted-foreground">@{other?.username}</div>
      </div>
      <div className="glass p-4 h-[60vh] overflow-y-auto space-y-2 mb-3">
        {msgs.length === 0 && <div className="text-center text-muted-foreground text-sm">Say hi.</div>}
        {msgs.map((m) => {
          const mine = m.sender_id === session.user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted border border-border"}`}>
                {m.content}
                <div className={`text-[10px] mt-0.5 opacity-60`}>{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="leak-input flex-1" />
        <button className="btn-red"><Send size={16} /></button>
      </form>
    </div>
  );
}