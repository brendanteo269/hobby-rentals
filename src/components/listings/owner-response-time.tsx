import { Clock } from "lucide-react";
import { responseTimeLabel, type ResponseTimeBand } from "@/lib/response-time";

/**
 * The clock's colour, fastest to slowest. Only the icon is coloured: the label
 * stays in body ink, so the band never depends on colour alone. The slowest
 * band is plain grey rather than red, which would read as a warning about
 * the owner.
 */
const CLOCK_TONES: Record<ResponseTimeBand, string> = {
  HOUR: "text-success",
  FEW_HOURS: "text-info",
  DAY: "text-warning",
  FEW_DAYS: "text-ink-soft",
};

/**
 * S5-17: "Usually replies within a few hours", beside the owner. Renders
 * nothing when the owner has too little history (Scenario 4).
 */
export function OwnerResponseTime({ band, className = "" }: { band?: string | null; className?: string }) {
  const label = responseTimeLabel(band);
  if (!label) return null;
  return (
    <p className={`flex items-center gap-1.5 text-sm text-ink-soft ${className}`}>
      <Clock className={`size-3.5 ${CLOCK_TONES[band as ResponseTimeBand]}`} aria-hidden="true" />
      {label}
    </p>
  );
}
