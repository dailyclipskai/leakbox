import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { Logo } from "@/components/Logo";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoxLeak — Browse boxes" },
      { name: "description", content: "website for discovering and sharing community-created "boxes" of information." },
      { property: "og:title", content: "BoxLeak — Browse boxes" },
      { property: "og:description", content: "website for discovering and sharing community-created "boxes" of information." },
    ],
  }),
  component: Home,
});

function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { settings, loaded } = useSiteSettings();

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <section className="flex flex-col items-center text-center pt-16 sm:pt-24 pb-14 fade-in">
        <Logo size={96} />
        {loaded && settings.site_name && (
          <h1 className="mt-6 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {settings.site_name}
          </h1>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/browse", search: q.trim() ? { q: q.trim() } : {} });
          }}
          className="mt-8 w-full max-w-xl"
        >
          <div className="glass flex items-center gap-2 px-3 py-1.5">
            <Search size={18} className="text-muted-foreground ml-1" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search boxes, creators, tags…"
              aria-label="Search"
              className="flex-1 bg-transparent outline-none py-2.5 px-1 text-sm placeholder:text-muted-foreground"
            />
            <button type="submit" className="btn-red !py-1.5 !px-4 text-xs">Search</button>
          </div>
        </form>
      </section>

      <div className="max-w-md mx-auto">
        <Leaderboard />
      </div>
    </div>
  );
}
