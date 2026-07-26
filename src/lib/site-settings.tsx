import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  logo_url: string | null;
  primary_color: string;
};

const DEFAULTS: SiteSettings = { logo_url: null, primary_color: "oklch(0.52 0.22 25)" };

const Ctx = createContext<{ settings: SiteSettings; refresh: () => Promise<void> }>({
  settings: DEFAULTS,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  async function refresh() {
    const { data } = await supabase.from("site_settings").select("logo_url, primary_color").eq("id", 1).maybeSingle();
    if (data) setSettings({ logo_url: data.logo_url ?? null, primary_color: data.primary_color || DEFAULTS.primary_color });
  }

  useEffect(() => {
    refresh();
    const ch = supabase.channel("site_settings").on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => refresh()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", settings.primary_color);
  }, [settings.primary_color]);

  return <Ctx.Provider value={{ settings, refresh }}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);