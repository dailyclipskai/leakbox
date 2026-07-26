import { Link } from "@tanstack/react-router";
import { Eye, Heart } from "lucide-react";
import { BoxImage } from "./BoxImage";
import { VerifiedBadge } from "./VerifiedBadge";
import { highlight } from "@/lib/highlight";

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
  profiles?: { username: string; display_name: string; verified: boolean } | null;
};

export function BoxCard({ box, query = "" }: { box: BoxRow; query?: string }) {
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
            <VerifiedBadge size={22} />
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
              {box.profiles?.verified && <VerifiedBadge size={12} className="inline ml-1" />}
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