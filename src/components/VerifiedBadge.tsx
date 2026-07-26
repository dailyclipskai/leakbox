import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <BadgeCheck size={size} className={`badge-verified ${className}`} strokeWidth={2.5} />;
}