import defaultLogoAsset from "@/assets/skull-star-logo.png.asset.json";
import { useSiteSettings } from "@/lib/site-settings";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const { settings } = useSiteSettings();
  const src = settings.logo_url || defaultLogoAsset.url;
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
