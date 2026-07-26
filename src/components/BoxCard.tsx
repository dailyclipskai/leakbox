import { Link } from "@tanstack/react-router";
import { Eye, Heart, Image as ImageIcon, Video, Lock } from "lucide-react";
import { BoxImage } from "./BoxImage";
import { VerifiedBadge } from "./VerifiedBadge";
import { highlight } from "@/lib/highlight";

export type BoxMedia = { path: string; kind: "image" | "video" };

export type BoxRow = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  verified: boolean;
  views: number;
  likes: number;
  created_at: string;
  author_id: string;
  discord_id: string | null;
  phone: string | null;
  gmail: string | null;
  visibility?: "public" | "private";
  media?: BoxMedia[] | null;
  profiles?: { username: string; display_name: string; verified: boolean } | null;
};

export function BoxCard({ box, query = "" }: { box: BoxRow; query?: string }) {
  const media = Array.isArray(box.media) ? box.media : [];
  const imgCount = media.filter((m) => m.kind === "image").length + (box.image_url && !media.some((m) => m.path === box.image_url) ? 1 : 0);
  const vidCount = media.filter((m) => m.kind === "video").length;
  const isPrivate = box.visibility === "private";
  return (
    <Link
      to="/box/$id"
      params={{ id: box.id }}
      search={{ q: query || undefined }}
      className="glass neon-hover block overflow-hidden fade-in"
    >
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        <BoxImage path={box.image_url} alt={box.name} className="w-full h-full object-cover" fallbackClassName="w-full h-full" />
        {box.verified && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur rounded-full p-1">
            <VerifiedBadge size={22} title="Verified box" />
          </div>
        )}
        {isPrivate && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            <Lock size={11} /> Private
          </div>
        )}
        {(imgCount > 0 || vidCount > 0) && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/70 backdrop-blur rounded-md px-2 py-0.5 text-[11px] text-foreground">
            {imgCount > 0 && <span className="flex items-center gap-1"><ImageIcon size={11} /> {imgCount}</span>}
            {vidCount > 0 && <span className="flex items-center gap-1"><Video size={11} /> {vidCount}</span>}
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-horror text-lg text-primary red-glow line-clamp-1">
          {highlight(box.name, query)}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {highlight(box.description, query)}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-primary/20">
          <span>
            by{" "}
            <span className="text-foreground">
              @{box.profiles?.username ?? "unknown"}
              {box.profiles?.verified && <VerifiedBadge size={12} className="inline ml-1" title="Verified user" />}
            </span>
          </span>
          <span>{new Date(box.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><Eye size={14} /> {box.views.toLocaleString()}</span>
          <span className="flex items-center gap-1 text-primary"><Heart size={14} /> {box.likes.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  );
}