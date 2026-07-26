import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth-context";
import { Bell, LogOut, Shield } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse Boxes" },
  { to: "/users", label: "Users" },
  { to: "/friends", label: "Friends" },
  { to: "/messages", label: "Messages" },
  { to: "/profile", label: "Profile" },
];

export function Header() {
  const { session, profile, isAdmin, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="relative z-10 pt-6 pb-3 px-4 fade-in">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-2">
        <Link to="/" className="flex flex-col items-center gap-1 group">
          <h1 className="font-horror text-3xl md:text-4xl text-primary red-glow tracking-wider">
            LeakBox
          </h1>
          <Logo size={44} className="group-hover:scale-110 transition-transform" />
        </Link>

        <nav className="mt-3 flex flex-wrap items-center justify-center gap-1 md:gap-2 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
              activeProps={{ className: "px-3 py-1.5 rounded-md text-foreground bg-primary/25 border border-primary/40 red-glow" }}
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="px-3 py-1.5 rounded-md text-primary hover:bg-primary/20 flex items-center gap-1">
              <Shield size={14} /> Admin
            </Link>
          )}
          <span className="mx-2 h-4 w-px bg-primary/30 hidden md:block" />
          {session ? (
            <>
              <Link to="/notifications" className="p-2 rounded-md hover:bg-primary/15 text-muted-foreground hover:text-foreground">
                <Bell size={16} />
              </Link>
              <span className="text-xs text-muted-foreground hidden md:inline">@{profile?.username}</span>
              <button
                onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
                className="p-2 rounded-md hover:bg-primary/15 text-muted-foreground hover:text-foreground"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "login" }} className="btn-ghost !py-1 !px-3 text-xs">Login</Link>
              <Link to="/auth" search={{ mode: "register" }} className="btn-red !py-1 !px-3 text-xs">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}