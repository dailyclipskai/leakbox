import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Leaderboard } from "@/components/Leaderboard";
import { BrowseFeed } from "@/components/BrowseFeed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeakBox — Browse community boxes" },
      { name: "description", content: "Community-verified boxes. Search, browse, and share." },
      { property: "og:title", content: "LeakBox — Browse community boxes" },
      { property: "og:description", content: "Community-verified boxes. Search, browse, and share." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      {/* Compact hero */}
      <section className="text-center py-6 fade-in">
        <h2 className="font-horror text-4xl md:text-5xl text-primary red-glow-lg">LeakBox</h2>
        <div className="mt-2 flex justify-center"><Logo size={56} /></div>
        <p className="mt-3 text-sm text-muted-foreground italic">Browse community boxes.</p>
      </section>

      {/* Two-column layout: leaderboard left, browse feed right */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-6 mt-4">
        <div className="lg:sticky lg:top-6 self-start">
          <Leaderboard />
        </div>
        <BrowseFeed />
      </div>
    </div>
  );
}
