import { useAuth } from "@/lib/auth-context";
import { Ban } from "lucide-react";

export function BanGate() {
  const { profile, signOut } = useAuth();
  if (!profile?.banned) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md px-4">
      <div className="glass-strong max-w-md w-full p-8 text-center border-2 border-primary/60 fade-in">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center pulse-red">
            <Ban size={32} className="text-primary" />
          </div>
        </div>
        <h2 className="font-horror text-3xl text-primary red-glow-lg mb-3">Access Denied</h2>
        <p className="text-sm text-muted-foreground mb-6">This account is banned from this website.</p>
        <button onClick={signOut} className="btn-red w-full">Sign out</button>
      </div>
    </div>
  );
}