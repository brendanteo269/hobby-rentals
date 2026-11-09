import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui";
import {
  RISK_LEVEL_GUIDANCE,
  RISK_LEVEL_LABELS,
  type BookingRisk,
  type RiskLevel,
} from "@/lib/booking-risk";

/**
 * S6-05 Scenario 1: the risk rating on a pending booking request.
 *
 * Every reason is shown with the rating, not behind a link, because a level
 * on its own is a colour and an owner cannot act on a colour. Three at most,
 * heaviest first, exactly as the server ranked them.
 *
 * What the panel does NOT say is deliberate: it never recommends declining.
 * The rating is a prompt to look more closely, and a renter wrongly rated
 * High is a real person losing a booking.
 */
const LEVEL_STYLE: Record<RiskLevel, { icon: LucideIcon; badge: "success" | "warning" | "accent" }> = {
  LOW: { icon: ShieldCheck, badge: "success" },
  MEDIUM: { icon: ShieldQuestion, badge: "warning" },
  HIGH: { icon: ShieldAlert, badge: "accent" },
};

export function BookingRiskPanel({ risk }: { risk: BookingRisk }) {
  const { icon: Icon, badge } = LEVEL_STYLE[risk.level];

  return (
    <section className="card p-5" aria-labelledby="risk-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="risk-heading" className="eyebrow">
          Booking risk
        </p>
        <Badge variant={badge} className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3" aria-hidden />
          {RISK_LEVEL_LABELS[risk.level]}
        </Badge>
      </div>

      <p className="body-copy mt-2">{RISK_LEVEL_GUIDANCE[risk.level]}</p>

      {risk.reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {risk.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden className="text-ink-soft">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
