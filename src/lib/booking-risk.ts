/**
 * S6-05: how a pending booking request reads to its owner.
 *
 * The level and the reasons are decided by arithmetic over platform
 * signals on the server, never by a language model - a model may only have
 * reworded the reasons, which `phrased_by` records. Nothing here recomputes
 * anything: the owner sees what was assessed when the request arrived.
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type BookingRisk = {
  level: RiskLevel;
  score: number;
  /** At most three, heaviest first. */
  reasons: string[];
  reason_codes: string[];
  phrased_by: "TEMPLATE" | "MODEL";
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low risk",
  MEDIUM: "Medium risk",
  HIGH: "High risk",
};

/**
 * What the owner is being told to do about it.
 *
 * Deliberately not "decline": the rating is a prompt to look closer, not a
 * verdict, and a renter wrongly rated High is someone's booking lost.
 */
export const RISK_LEVEL_GUIDANCE: Record<RiskLevel, string> = {
  LOW: "Nothing here suggests extra caution.",
  MEDIUM: "Worth a closer look before you accept.",
  HIGH: "Worth a closer look before you accept. Consider asking about their plans, or declining.",
};

/**
 * S6-05 Scenario 3: the owner's conditional acceptance, awaiting the renter.
 *
 * The booking stays PENDING while this is open - it is the offer that has a
 * status, the same way a booking extension does.
 */
export type DepositOffer = {
  id: string;
  booking_id: string;
  /** What the deposit goes up BY, so the renter pays this on top. */
  extra_deposit_cents: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  /** The renter's own deadline, the same length the owner was given. */
  respond_by: string;
  created_at: string;
  responded_at: string | null;
};

/** Whether the renter still has this to answer. */
export function isOpenOffer(offer?: DepositOffer | null): boolean {
  return offer?.status === "PENDING";
}
