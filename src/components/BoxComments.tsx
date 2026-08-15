import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "@/components/connections/UsersPanel";
import { Heart, Reply, Trash2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; username: string; display_name: string; verified: boolean; profile_picture: string | null };
export type CommentRow = {
  id: string; box_id: string; user_id: string; parent_id: string | null;
  content: string; likes: number; created_at: string;
  profiles?: Profile | null;
};

export function BoxComments({
  boxId,
  boxAuthorId,
  enabled,
}: {
  boxId: string;
  boxAuthorId: string;
  enabled: boolean;
}) {
  const { session, isAdmin } = useAuth();
  const uid = session?.user?.id ?? null;
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("box_comments")
      .select("id, box_id, user_id, parent_id, content, likes, created_at, profiles:profiles!box_comments_user_id_fkey(id, username, display_name, verified, profile_picture)")
      .eq("box_id", boxId)
      .order("created_at", { ascending: true });
    if (error) { setRows([]); return; }
    setRows((data as unknown as CommentRow[]) ?? []);
    if (uid) {
      const { data: likes } = await supabase.from("comment_likes").select("comment_id").eq("user_id", uid);
      setLikedIds(new Set((likes ?? []).map((l) => l.comment_id)));
    } else {
      setLikedIds(new Set());
    }
  }, [boxId, uid]);

  useEffect(() => { load(); }, [load]);

  const { roots, childrenOf, total } = useMemo(() => {
    const list = rows ?? [];
    const childrenOf = new Map<string, CommentRow[]>();
    const roots: CommentRow[] = [];
    for (const c of list) {
      if (c.parent_id) {
        const arr = childrenOf.get(c.parent_id) ?? [];
        arr.push(c);
        childrenOf.set(c.parent_id, arr);
      } else roots.push(c);
    }
    return { roots, childrenOf, total: list.length };
  }, [rows]);

  async function submit() {
    if (!uid) { toast.error("Create an account to comment."); return; }
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    const { error } = await supabase.from("box_comments").insert({
      box_id: boxId, user_id: uid, content, parent_id: replyTo?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); setReplyTo(null);
    load();
  }

  async function toggleCommentLike(c: CommentRow) {
    if (!uid) { toast.error("Create an account to like comments."); return; }
    const liked = likedIds.has(c.id);
    setRows((r) => (r ?? []).map((x) => (x.id === c.id ? { ...x, likes: Math.max(0, x.likes + (liked ? -1 : 1)) } : x)));
    setLikedIds((s) => { const n = new Set(s); liked ? n.delete(c.id) : n.add(c.id); return n; });
    const { error } = liked
      ? await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", uid)
      : await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: uid });
    if (error) { toast.error(error.message); load(); }
  }

  async function remove(c: CommentRow) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("box_comments").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Comment deleted.");
    load();
  }

  const canDelete = (c: CommentRow) => !!uid && (c.user_id === uid || uid === boxAuthorId || isAdmin);

  function Item({ c, depth = 0 }: { c: CommentRow; depth?: number }) {
    const kids = childrenOf.get(c.id) ?? [];
    return (
      <div className={depth > 0 ? "ml-6 sm:ml-10 border-l border-border pl-3" : ""}>
        <div className="glass p-3 fade-in">
          <div className="flex items-start gap-3">
            <Avatar p={{ username: c.profiles?.username ?? "?", profile_picture: c.profiles?.profile_picture ?? null }} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <Link to="/u/$username" params={{ username: c.profiles?.username ?? "" }} className="font-medium hover:underline truncate">
                  {c.profiles?.display_name ?? "unknown"}
                </Link>
                {c.profiles?.verified && <VerifiedBadge size={12} title="Verified user" />}
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <button onClick={() => toggleCommentLike(c)} className={`inline-flex items-center gap-1 hover:text-foreground ${likedIds.has(c.id) ? "text-primary" : "text-muted-foreground"}`}>
                  <Heart size={13} fill={likedIds.has(c.id) ? "currentColor" : "none"} /> {c.likes}
                </button>
                {enabled && (
                  <button onClick={() => { setReplyTo(c); setText(""); }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Reply size={13} /> Reply
                  </button>
                )}
                {canDelete(c) && (
                  <button onClick={() => remove(c)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {kids.length > 0 && <div className="mt-2 space-y-2">{kids.map((k) => <Item key={k.id} c={k} depth={depth + 1} />)}</div>}
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare size={18} /> Comments <span className="text-muted-foreground text-sm">({total})</span>
      </h2>

      {!enabled ? (
        <div className="glass p-5 text-center text-sm text-muted-foreground">Comments are turned off for this box.</div>
      ) : !uid ? (
        <div className="glass p-5 text-center text-sm text-muted-foreground">
          You need an account to comment. <Link to="/auth" className="text-foreground underline">Sign in</Link>
        </div>
      ) : (
        <div className="glass p-3 space-y-2">
          {replyTo && (
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Replying to @{replyTo.profiles?.username}</span>
              <button onClick={() => setReplyTo(null)} className="hover:text-foreground">cancel</button>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Write a comment..."
            className="leak-input resize-none"
          />
          <div className="flex justify-end">
            <button onClick={submit} disabled={busy || !text.trim()} className="btn-red !py-1.5 !px-3 text-sm">
              <Send size={14} /> {replyTo ? "Reply" : "Comment"}
            </button>
          </div>
        </div>
      )}

      {rows === null ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : roots.length === 0 ? (
        <div className="glass p-5 text-center text-sm text-muted-foreground">No comments yet.</div>
      ) : (
        <div className="space-y-2">{roots.map((c) => <Item key={c.id} c={c} />)}</div>
      )}
    </section>
  );
}
