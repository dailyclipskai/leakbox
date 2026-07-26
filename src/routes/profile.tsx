import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LeakBox" },
      { name: "description", content: "Your LeakBox profile." },
      { property: "og:title", content: "Profile — LeakBox" },
      { property: "og:description", content: "Your LeakBox profile." },
    ],
  }),
  component: ProfileRedirect,
});

function ProfileRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="p-6 max-w-md mx-auto"><div className="skeleton h-24" /></div>;
  if (!profile) return (
    <div className="max-w-md mx-auto p-6 text-center glass mt-8">
      <p className="mb-3">Sign in to view your profile.</p>
      <Link to="/auth" search={{ mode: "login" }} className="btn-red">Login</Link>
    </div>
  );
  return (
    <div className="max-w-md mx-auto p-6 text-center glass mt-8">
      <p className="mb-3">Your profile: <span className="text-primary">@{profile.username}</span></p>
      <Link to="/u/$username" params={{ username: profile.username }} className="btn-red">Open profile</Link>
      <div className="mt-3"><Link to="/post" className="btn-ghost">Post a box</Link></div>
    </div>
  );
}