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
export type DamageType =
  | "SCRATCH"
  | "DENT"
  | "CRACK"
  | "STAIN"
  | "MISSING_PART"
  | "DISCOLOURATION"
  | "OTHER";
export type Severity = "MINOR" | "MODERATE" | "SEVERE";
export type AngleStatus =
  "COMPARED" | "MODEL_ONLY" | "NOT_COMPARED" | "NOT_APPLICABLE";

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
  /** How the photos were lined up; `inliers` is the number of matching points. */
  alignment?: { aligned?: boolean; inliers?: number; reason?: string } | null;
  /** The return photo's light and glare before they were evened out. Missing on older scans. */
  conditions?: {
    brightness_change?: number;
    warmth_change?: number;
    glare_fraction?: number;
    compared_fraction?: number;
  } | null;
  regions_found?: number | null;
  /** Changed areas the AI judged were only lighting, reflections or the like. */
  dismissed?: number | null;
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
export type ConditionScanState = Pick<
  ConditionScan,
  "id" | "status" | "verdict"
>;

/** The owner's condition report for a returned booking: the CTA target of the scan notifications too. */
export function ownerConditionReportPath(
  bookingId: string,
): `/listings/mine/bookings/${string}/condition` {
  return `/listings/mine/bookings/${bookingId}/condition`;
}

/** One word-or-two for where a scan stands, and how loudly to show it. */
export function scanBadge(scan: ConditionScanState): {
  label: string;
  tone: "neutral" | "accent" | "dark";
} {
  if (scan.status === "PROCESSING")
    return { label: "AI check running", tone: "neutral" };
  if (scan.status === "FAILED")
    return { label: "AI check needs you", tone: "accent" };
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
  return reference === "PICKUP"
    ? "Your renter's pickup photo"
    : "Your baseline photo";
}

/** One cell of the "what the AI checked" table: fine, something found, or not applicable. */
export type CheckCell = { tone: "ok" | "found" | "none"; text: string };
export type CheckRow = { label: string; hint: string; cells: CheckCell[] };

const NOT_CHECKED: CheckCell = { tone: "none", text: "—" };

/** The kinds of change looked for, and which damage types count as each. */
const CHANGE_KINDS: {
  label: string;
  hint: string;
  matches: (finding: Finding) => boolean;
}[] = [
  {
    label: "Scratches & cracks",
    hint: "Thin lines, gouges, splits",
    matches: (f) =>
      !f.is_wear && (f.damage_type === "SCRATCH" || f.damage_type === "CRACK"),
  },
  {
    label: "Dents & shape",
    hint: "Pushed-in or deformed surfaces",
    matches: (f) => !f.is_wear && f.damage_type === "DENT",
  },
  {
    label: "Stains & colour",
    hint: "Marks, spills, fading, paint",
    matches: (f) =>
      !f.is_wear &&
      (f.damage_type === "STAIN" || f.damage_type === "DISCOLOURATION"),
  },
  {
    label: "Missing pieces",
    hint: "Parts, corners or buttons gone",
    matches: (f) => !f.is_wear && f.damage_type === "MISSING_PART",
  },
  {
    label: "Other changes",
    hint: "Anything else, or a change the AI couldn't name",
    matches: (f) => !f.is_wear && (f.damage_type === "OTHER" || !f.classified),
  },
  {
    label: "Normal wear",
    hint: "Light scuffs and fading - not damage",
    matches: (f) => f.is_wear,
  },
];

function percent(fraction: number): number {
  return Math.round(Math.abs(fraction) * 100);
}

/** e.g. "18% darker, warmer light" or "Same as before". */
export function lightingText(
  conditions: NonNullable<ScanAngle["conditions"]>,
): string {
  const parts: string[] = [];
  const brightness = conditions.brightness_change ?? 0;
  const warmth = conditions.warmth_change ?? 0;
  if (Math.abs(brightness) >= 0.05)
    parts.push(
      `${percent(brightness)}% ${brightness < 0 ? "darker" : "brighter"}`,
    );
  if (Math.abs(warmth) >= 3)
    parts.push(`${warmth > 0 ? "warmer" : "cooler"} light`);
  return parts.length ? `Evened out: ${parts.join(", ")}` : "Same as before";
}

/**
 * The scan step by step, one row per check and one cell per angle: what each
 * return photo was compared with, how it was lined up and evened out, and
 * which kinds of change were found. Angles that were not compared show "—".
 */
export function checklistRows(scan: Pick<ConditionScan, "angles">): CheckRow[] {
  const angles = scan.angles;
  const measured = (angle: ScanAngle) => angle.status === "COMPARED";
  const looked = (angle: ScanAngle) =>
    angle.status === "COMPARED" || angle.status === "MODEL_ONLY";
  const row = (
    label: string,
    hint: string,
    cell: (angle: ScanAngle) => CheckCell,
  ): CheckRow => ({ label, hint, cells: angles.map(cell) });

  return [
    row("Earlier photo", "What the return photo was compared with", (angle) =>
      angle.reference
        ? {
            tone: "ok",
            text:
              angle.reference === "PICKUP" ? "Pickup photo" : "Your baseline",
          }
        : { tone: "none", text: "None taken" },
    ),
    row("Lined up", "Camera angle, tilt and distance corrected", (angle) =>
      measured(angle)
        ? {
            tone: "ok",
            text: angle.alignment?.inliers
              ? `${angle.alignment.inliers} matching points`
              : "Lined up",
          }
        : angle.status === "MODEL_ONLY"
          ? { tone: "found", text: "Couldn't line up - AI compared directly" }
          : NOT_CHECKED,
    ),
    row(
      "Background ignored",
      "Only the item is compared, not the table or wall",
      (angle) =>
        measured(angle) ? { tone: "ok", text: "Item only" } : NOT_CHECKED,
    ),
    row(
      "Lighting",
      "Brighter, darker or tinted light is corrected first",
      (angle) =>
        measured(angle) && angle.conditions
          ? { tone: "ok", text: lightingText(angle.conditions) }
          : NOT_CHECKED,
    ),
    row("Glare ignored", "Blown-out reflections carry no detail", (angle) =>
      measured(angle) && angle.conditions
        ? {
            tone: "ok",
            text:
              (angle.conditions.glare_fraction ?? 0) < 0.005
                ? "No glare"
                : `${percent(angle.conditions.glare_fraction ?? 0)}% of the item`,
          }
        : NOT_CHECKED,
    ),
    row("Area compared", "How much of the item was checked closely", (angle) =>
      measured(angle) && angle.conditions?.compared_fraction != null
        ? {
            tone: "ok",
            text: `${percent(angle.conditions.compared_fraction)}% of the item`,
          }
        : NOT_CHECKED,
    ),
    ...CHANGE_KINDS.map((kind) =>
      row(kind.label, kind.hint, (angle) => {
        if (!looked(angle)) return NOT_CHECKED;
        const count = angle.findings.filter(kind.matches).length;
        return count
          ? {
              tone: kind.label === "Normal wear" ? "ok" : "found",
              text: `${count} found`,
            }
          : { tone: "ok", text: "None" };
      }),
    ),
    row(
      "False alarms dismissed",
      "Areas the AI judged were only lighting, shadow or reflection",
      (angle) =>
        looked(angle)
          ? { tone: "ok", text: String(angle.dismissed ?? 0) }
          : NOT_CHECKED,
    ),
    row(
      "Difference score",
      "0 = identical; changes from 0.42 are examined",
      (angle) =>
        measured(angle) && angle.anomaly_score != null
          ? { tone: "ok", text: angle.anomaly_score.toFixed(2) }
          : NOT_CHECKED,
    ),
  ];
}
