import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  size = 18,
  className = "",
  title = "Verified",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} aria-label={title} className="inline-flex align-middle">
      <BadgeCheck size={size} className={`badge-verified ${className}`} strokeWidth={2.5} />
    </span>
  );
}