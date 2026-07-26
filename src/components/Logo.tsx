import defaultLogo from "@/assets/logo.gif";
import { useSiteSettings } from "@/lib/site-settings";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const { settings } = useSiteSettings();
  const src = settings.logo_url || defaultLogo;
  const custom = !!settings.logo_url;
  return (
    <img
      src={src}
      alt="LeakBox logo"
      width={size}
      height={size}
      className={`${custom ? "" : "logo-red"} inline-block ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}