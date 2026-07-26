import type { ReactNode } from "react";

export function highlight(text: string | null | undefined, query: string | null | undefined): ReactNode {
  if (!text) return null;
  const q = (query ?? "").trim();
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>,
  );
}