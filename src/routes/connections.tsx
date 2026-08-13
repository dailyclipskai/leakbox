import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UsersPanel } from "@/components/connections/UsersPanel";
import { FriendsPanel } from "@/components/connections/FriendsPanel";
import { MessagesPanel } from "@/components/connections/MessagesPanel";
import { useCounters } from "@/lib/use-counters";

type Tab = "users" | "friends" | "messages";
const TABS: Tab[] = ["users", "friends", "messages"];

export const Route = createFileRoute("/connections")({
  validateSearch: (s: Record<string, unknown>): { tab: Tab } => ({
    tab: TABS.includes(s.tab as Tab) ? (s.tab as Tab) : "users",
  }),
  head: () => ({
    meta: [
      { title: "Connections — People, friends and messages" },
      { name: "description", content: "Find people, manage friend requests and chat privately — all in one place." },
      { property: "og:title", content: "Connections — People, friends and messages" },
      { property: "og:description", content: "Find people, manage friend requests and chat privately — all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Connections,
});

function Connections() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/connections" });
  const counters = useCounters();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-horror text-3xl">Connections</h1>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => navigate({ search: { tab: t } })}
            className={`px-3 py-1.5 rounded-md text-sm capitalize border transition-colors flex items-center gap-1.5 ${tab === t ? "border-border bg-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t}
            {t === "friends" && counters.requests > 0 && <Dot n={counters.requests} />}
            {t === "messages" && counters.messages > 0 && <Dot n={counters.messages} />}
          </button>
        ))}
      </div>
      {tab === "users" && <UsersPanel />}
      {tab === "friends" && <FriendsPanel />}
      {tab === "messages" && <MessagesPanel />}
    </div>
  );
}

function Dot({ n }: { n: number }) {
  return <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{n > 99 ? "99+" : n}</span>;
}
