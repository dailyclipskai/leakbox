import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/storage";

export function BoxImage({
  path,
  alt,
  className = "",
  fallbackClassName = "",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedUrl(path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);

  if (!path) {
    return (
      <div className={`flex items-center justify-center bg-black/60 text-primary/50 font-horror text-sm ${fallbackClassName || className}`}>
        no image
      </div>
    );
  }
  if (!url) return <div className={`skeleton ${className}`} />;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}