import { Clock } from "lucide-react";
import { responseTimeLabel } from "@/lib/response-time";

/**
 * S5-17: "Usually replies within a few hours", beside the owner. Renders
 * nothing when the owner has too little history (Scenario 4).
 */
export function OwnerResponseTime({ band, className = "" }: { band?: string | null; className?: string }) {
  const label = responseTimeLabel(band);
  if (!label) return null;
  return (
    <p className={`flex items-center gap-1.5 text-sm text-ink-soft ${className}`}>
      <Clock className="size-3.5" aria-hidden="true" />
      {label}
    </p>
  );
}
