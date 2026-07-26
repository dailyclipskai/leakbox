import logo from "@/assets/logo.gif";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="LeakBox logo"
      width={size}
      height={size}
      className={`logo-red inline-block ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}