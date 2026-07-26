import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const KEY = "leakbox-age-ok";

export function AgeGate() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOk(localStorage.getItem(KEY) === "1");
    } catch {
      setOk(true);
    }
  }, []);

  if (ok === null || ok) return null;

  function accept() {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOk(true);
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
      <div className="glass-strong max-w-md w-full p-8 text-center border-2 border-primary/60 fade-in">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center pulse-red">
            <AlertTriangle size={32} className="text-primary" />
          </div>
        </div>
        <h2 className="font-horror text-3xl text-primary red-glow-lg mb-2">18+ Warning</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This website contains content intended for adults only. By entering you confirm you are at least
          <span className="text-primary font-semibold"> 18 years old</span> and accept exposure to disturbing,
          horror-themed, and community-generated material.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={leave} className="btn-ghost flex-1">I'm under 18 — Leave</button>
          <button onClick={accept} className="btn-red flex-1 pulse-red">I'm 18+ — Enter</button>
        </div>
      </div>
    </div>
  );
}