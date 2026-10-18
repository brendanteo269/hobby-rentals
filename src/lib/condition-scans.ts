import type { ReturnAngle } from "@/lib/returns";

/**
 * S3-05: the AI condition scan of a returned item. Mirrors
 * app/routers/condition_scans.py.
 *
 * Completing the return photos starts a scan. It compares each return photo
 * with the owner's baseline photo of that angle (or the renter's pickup photo
 * where the baseline has no such view), maps where they differ, and has the
 * AI label each change: what kind, how severe, and whether it is normal wear.
 * The verdict only advises the owner; it never files a claim (S3-06) or moves
 * money.
 */

export type ScanStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type ScanVerdict = "CLEAR" | "DAMAGE_DETECTED";
export type DamageType = "SCRATCH" | "DENT" | "CRACK" | "STAIN" | "MISSING_PART" | "DISCOLOURATION" | "OTHER";
export type Severity = "MINOR" | "MODERATE" | "SEVERE";
export type AngleStatus = "COMPARED" | "MODEL_ONLY" | "NOT_COMPARED" | "NOT_APPLICABLE";

export type Finding = {
  /** The number drawn on the difference map. */
  number: number;
  /** Fractions (0-1) of the difference map; null if the AI could not place it. */
  box: { x: number; y: number; w: number; h: number } | null;
  /** Null when the AI could not classify the change (`classified` false). */
  damage_type: DamageType | null;
  severity: Severity | null;
  is_wear: boolean;
  summary: string;
  confidence: number | null;
  classified: boolean;
};

export type ScanAngle = {
  angle: ReturnAngle;
  label: string;
  status: AngleStatus;
  /** What the return photo was compared with. */
  reference: "BASELINE" | "PICKUP" | null;
  return_photo_url: string | null;
  reference_photo_url: string | null;
  /** The aligned return photo with the differences as a heatmap and findings boxed. */
  diff_map_url: string | null;
  anomaly_score: number | null;
  findings: Finding[];
  note: string | null;
};

export type ConditionScan = {
  id: string;
  booking_id: string;
  listing_id: string;
  status: ScanStatus;
  verdict: ScanVerdict | null;
  anomaly_score: number | null;
  threshold: number | null;
  angles: ScanAngle[];
  summary: string | null;
  model_version: string | null;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
};

/** What the bookings lists carry about a booking's scan. */
export type ConditionScanState = Pick<ConditionScan, "id" | "status" | "verdict">;

/** The owner's condition report for a returned booking: the CTA target of the scan notifications too. */
export function ownerConditionReportPath(bookingId: string): `/listings/mine/bookings/${string}/condition` {
  return `/listings/mine/bookings/${bookingId}/condition`;
}

/** One word-or-two for where a scan stands, and how loudly to show it. */
export function scanBadge(scan: ConditionScanState): { label: string; tone: "neutral" | "accent" | "dark" } {
  if (scan.status === "PROCESSING") return { label: "AI check running", tone: "neutral" };
  if (scan.status === "FAILED") return { label: "AI check needs you", tone: "accent" };
  return scan.verdict === "DAMAGE_DETECTED"
    ? { label: "Possible damage", tone: "accent" }
    : { label: "No damage found", tone: "dark" };
}

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  SCRATCH: "Scratch",
  DENT: "Dent",
  CRACK: "Crack",
  STAIN: "Stain",
  MISSING_PART: "Missing part",
  DISCOLOURATION: "Discolouration",
  OTHER: "Other change",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SEVERE: "Severe",
};

/** A finding's heading: its kind and severity, or that the AI could not tell. */
export function findingLabel(finding: Finding): string {
  if (finding.is_wear) return "Normal wear";
  if (!finding.classified || !finding.damage_type) return "Unclassified change";
  return finding.severity
    ? `${DAMAGE_TYPE_LABELS[finding.damage_type]} · ${SEVERITY_LABELS[finding.severity]}`
    : DAMAGE_TYPE_LABELS[finding.damage_type];
}

/** What the return photo was compared with, in words. */
export function referenceLabel(reference: ScanAngle["reference"]): string {
  return reference === "PICKUP" ? "Your renter's pickup photo" : "Your baseline photo";
}
