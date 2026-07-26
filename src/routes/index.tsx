import { createFileRoute } from "@tanstack/react-router";
import { Leaderboard } from "@/components/Leaderboard";
import { BrowseFeed } from "@/components/BrowseFeed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoxLeak — Browse boxes" },
      { name: "description", content: "LeakBox Central is a website for discovering and sharing community-created \"boxes\" of information." },
      { property: "og:title", content: "BoxLeak — Browse boxes" },
      { property: "og:description", content: "LeakBox Central is a website for discovering and sharing community-created \"boxes\" of information." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      {/* Two-column layout: leaderboard left, browse feed right */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-6 mt-6">
        <div className="lg:sticky lg:top-6 self-start">
          <Leaderboard />
        </div>
        <BrowseFeed />
      </div>
    </div>
  );
}
