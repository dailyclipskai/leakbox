import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

type Search = { mode?: "login" | "register" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "register" ? "register" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — LeakBox" },
      { name: "description", content: "Login or register on LeakBox." },
      { property: "og:title", content: "Sign in — LeakBox" },
      { property: "og:description", content: "Login or register on LeakBox." },
    ],
  }),
  component: Auth,
});

// username → synthetic email so we can use Supabase auth without email input
const syntheticEmail = (u: string) => `${u.toLowerCase()}@leakbox.local`;

const regSchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  username: z.string().trim().toLowerCase().min(3, "Min 3 characters").max(20).regex(/^[a-z0-9_]+$/, "Letters, numbers, underscore only"),
  password: z.string().min(6, "Min 6 characters").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

function Auth() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  // login state
  const [lUsername, setLUsername] = useState("");
  const [lPassword, setLPassword] = useState("");
  // register state
  const [rForm, setRForm] = useState({ display_name: "", username: "", password: "", confirm: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail(lUsername.trim()),
      password: lPassword,
    });
    setLoading(false);
    if (error) return toast.error("Wrong username or password.");
    await refresh();
    toast.success("Welcome back.");
    navigate({ to: "/" });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const parsed = regSchema.safeParse(rForm);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
    setLoading(true);
    const { username, display_name, password } = parsed.data;
    // Check username availability
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing) { setLoading(false); return toast.error("Username taken."); }
    const { error } = await supabase.auth.signUp({
      email: syntheticEmail(username),
      password,
      options: { data: { username, display_name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Account created. Welcome!");
    navigate({ to: "/" });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="glass-strong p-8 fade-in">
        <div className="text-center mb-6">
          <Logo size={54} />
          <h1 className="font-horror text-3xl text-primary red-glow mt-2">
            {mode === "register" ? "Register" : "Login"}
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "login" } })}
            className={`flex-1 py-2 rounded-md text-sm border ${mode === "login" ? "bg-primary/25 border-primary red-glow" : "border-primary/25 text-muted-foreground"}`}
          >Login</button>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "register" } })}
            className={`flex-1 py-2 rounded-md text-sm border ${mode === "register" ? "bg-primary/25 border-primary red-glow" : "border-primary/25 text-muted-foreground"}`}
          >Register</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <input className="leak-input mt-1" value={lUsername} onChange={(e) => setLUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input type="password" className="leak-input mt-1" value={lPassword} onChange={(e) => setLPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="btn-red w-full pulse-red" disabled={loading}>{loading ? "..." : "Enter"}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Display Name</label>
              <input className="leak-input mt-1" value={rForm.display_name} onChange={(e) => setRForm({ ...rForm, display_name: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Username (min 3)</label>
              <input className="leak-input mt-1" value={rForm.username} onChange={(e) => setRForm({ ...rForm, username: e.target.value.toLowerCase() })} required minLength={3} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input type="password" className="leak-input mt-1" value={rForm.password} onChange={(e) => setRForm({ ...rForm, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Confirm Password</label>
              <input type="password" className="leak-input mt-1" value={rForm.confirm} onChange={(e) => setRForm({ ...rForm, confirm: e.target.value })} required />
            </div>
            <div className="text-xs text-primary/80 border border-primary/40 bg-primary/10 rounded p-2">
              ⚠ Remember your password. Password recovery through email is unavailable.
            </div>
            <button className="btn-red w-full pulse-red" disabled={loading}>{loading ? "..." : "Create account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
