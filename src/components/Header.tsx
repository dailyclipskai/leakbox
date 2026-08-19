import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth-context";
import { useSiteSettings } from "@/lib/site-settings";
import { useCounters } from "@/lib/use-counters";
import { Bell, LogOut, Shield, User } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/connections", label: "Connections" },
] as const;

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Header() {
  const { session, profile, isAdmin, signOut } = useAuth();
  const { settings, loaded } = useSiteSettings();
  const counters = useCounters();
  const router = useRouter();
  const connectionCount = counters.messages + counters.requests;

  return (
    <>
      <header className="relative z-10 border-b border-border/60 px-4 py-3 fade-in">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <Logo size={32} />
            <span className="font-display text-lg font-semibold tracking-tight">
              {loaded ? settings.site_name : ""}
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center shrink-0"
                activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-accent border border-border flex items-center shrink-0" }}
              >
                {n.label}
                {n.to === "/connections" && <Badge n={connectionCount} />}
              </Link>
            ))}

            {session ? (
              <>
                <Link
                  to="/profile"
                  className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center shrink-0"
                  activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-accent border border-border flex items-center shrink-0" }}
                >
                  Profile
                </Link>
                <span className="mx-2 h-4 w-px bg-border hidden md:block shrink-0" />
                <Link to="/notifications" className="relative p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground shrink-0">
                  <Bell size={16} />
                  {counters.notifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {counters.notifications > 9 ? "9+" : counters.notifications}
                    </span>
                  )}
                </Link>
                <span className="text-xs text-muted-foreground hidden md:inline shrink-0">@{profile?.username}</span>
                <button
                  onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground shrink-0"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1 shrink-0"
                  activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-accent border border-border flex items-center gap-1 shrink-0" }}
                >
                  <User size={14} /> Profile
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {isAdmin && (
        <Link
          to="/admin"
          title="Admin panel"
          aria-label="Admin panel"
          className="fixed bottom-5 left-5 z-50 w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
        >
          <Shield size={18} />
        </Link>
      )}
    </>
  );
}
