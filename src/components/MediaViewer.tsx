import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { signedUrl } from "@/lib/storage";
import { useSiteSettings } from "@/lib/site-settings";

export type ViewerMedia = { path: string; kind: "image" | "video" };

function Watermark() {
  const { settings, loaded } = useSiteSettings();
  if (!loaded || !settings.site_name) return null;
  return <span className="media-watermark">{settings.site_name}</span>;
}

function Slide({ media }: { media: ViewerMedia }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    signedUrl(media.path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [media.path]);

  if (!url) return <div className="skeleton w-full h-[52vh] min-h-[260px] rounded-md" />;
  if (media.kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="media-slide w-full max-h-[70vh] min-h-[240px] object-contain bg-black rounded-md"
      />
    );
  }
  return <img src={url} alt="" className="media-slide w-full max-h-[70vh] min-h-[240px] object-contain bg-black rounded-md" />;
}

export function MediaViewer({ items }: { items: ViewerMedia[] }) {
  const [index, setIndex] = useState(0);
  const total = items.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + total) % total), [total]);

  useEffect(() => { setIndex(0); }, [total]);

  useEffect(() => {
    if (total < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  const [touchX, setTouchX] = useState<number | null>(null);

  if (total === 0) return null;
  const current = items[Math.min(index, total - 1)]!;

  return (
    <div className="space-y-3">
      <div
        className="relative flex items-center justify-center bg-black/60 rounded-md overflow-hidden select-none"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX === null || total < 2) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        <Slide key={current.path} media={current} />
        <Watermark />

        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous item"
              onClick={() => go(-1)}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-background/60 backdrop-blur border border-border text-foreground/80 hover:text-foreground hover:bg-background/85 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next item"
              onClick={() => go(1)}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-background/60 backdrop-blur border border-border text-foreground/80 hover:text-foreground hover:bg-background/85 transition-all active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-background/60 backdrop-blur px-2 py-0.5 text-[11px] text-muted-foreground">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to item ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-foreground/80" : "w-1.5 bg-foreground/25 hover:bg-foreground/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
