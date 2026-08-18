import { createFileRoute } from "@tanstack/react-router";
import { BrowseFeed } from "@/components/BrowseFeed";

type Search = { q?: string };

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): Search => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Browse Boxes — LeakBox" },
      { name: "description", content: "Search and browse every community box on LeakBox." },
      { property: "og:title", content: "Browse Boxes — LeakBox" },
      { property: "og:description", content: "Search and browse every community box on LeakBox." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { q } = Route.useSearch();
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-horror text-3xl text-primary red-glow mb-4">Browse Boxes</h1>
      <BrowseFeed initialQuery={q ?? ""} />
    </div>
  );
}