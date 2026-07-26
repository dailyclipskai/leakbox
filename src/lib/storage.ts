import { supabase } from "@/integrations/supabase/client";

/**
 * Cache signed URLs for private bucket objects.
 * The path stored in DB is `<bucket>/<uid>/<file>`. We split on the first `/`.
 */
const cache = new Map<string, { url: string; exp: number }>();

export async function signedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.exp > now) return cached.url;
  const [bucket, ...rest] = path.split("/");
  const key = rest.join("/");
  if (!bucket || !key) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function useSignedUrl(path: string | null | undefined) {
  // simple hook via React
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect, useState } = require("react") as typeof import("react");
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedUrl(path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);
  return url;
}