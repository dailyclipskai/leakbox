import { useSiteSettings } from "@/lib/site-settings";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const { settings, loaded } = useSiteSettings();
  const src = settings.logo_url;
  if (!loaded || !src) return null;
  return (
    <img
      src={src}
      alt={`${settings.site_name} logo`}
      width={size}
      height={size}
      className={`logo-red inline-block ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
