import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_name: string;
  logo_url: string | null;
  primary_color: string;
  background_color: string;
  surface_color: string;
  foreground_color: string;
  muted_color: string;
  border_color: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "LeakBox",
  logo_url: null,
  primary_color: "oklch(0.97 0 0)",
  background_color: "oklch(0.09 0 0)",
  surface_color: "oklch(0.14 0 0)",
  foreground_color: "oklch(0.97 0 0)",
  muted_color: "oklch(0.62 0 0)",
  border_color: "oklch(0.28 0 0)",
};

const Ctx = createContext<{ settings: SiteSettings; loaded: boolean; refresh: () => Promise<void> }>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  refresh: async () => {},
});

const COLS = "site_name, logo_url, primary_color, background_color, surface_color, foreground_color, muted_color, border_color";

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("site_settings").select(COLS).eq("id", 1).maybeSingle();
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...(data as Partial<SiteSettings>), logo_url: (data as { logo_url: string | null }).logo_url ?? null });
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("site_settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty("--primary", settings.primary_color);
    s.setProperty("--background", settings.background_color);
    s.setProperty("--surface", settings.surface_color);
    s.setProperty("--card", settings.surface_color);
    s.setProperty("--popover", settings.surface_color);
    s.setProperty("--muted", settings.surface_color);
    s.setProperty("--input", settings.surface_color);
    s.setProperty("--accent", settings.surface_color);
    s.setProperty("--foreground", settings.foreground_color);
    s.setProperty("--muted-foreground", settings.muted_color);
    s.setProperty("--border", settings.border_color);
  }, [settings]);

  useEffect(() => {
    if (loaded) document.title = settings.site_name;
  }, [loaded, settings.site_name]);

  return <Ctx.Provider value={{ settings, loaded, refresh }}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);
export const useSiteName = () => useContext(Ctx).settings.site_name;
