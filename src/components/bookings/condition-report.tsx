import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import {
  findingLabel,
  referenceLabel,
  scanBadge,
  type ConditionScan,
  type ScanAngle,
} from "@/lib/condition-scans";

/**
 * S3-05: the AI condition scan of a returned item, for its owner. The verdict
 * and summary first, then each angle's before, after and difference map with
 * its findings. Advice only: the owner inspects the item and decides.
 */
export function ConditionReport({
  scan,
  action,
}: {
  scan: ConditionScan;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <Verdict scan={scan} />
      {action}
      {scan.angles.map((angle) => (
        <AngleReport key={angle.angle} angle={angle} />
      ))}
      {scan.completed_at && (
        <p className="text-xs text-ink-soft">
          Checked {formatDateTime(scan.completed_at)} by{" "}
          {scan.model_version ?? "the AI"}.
          {scan.threshold != null &&
            ` Changes scoring ${scan.threshold.toFixed(2)} or more are looked at closely.`}{" "}
          The AI can miss damage, and can flag things that aren&apos;t: check
          the item yourself before making a claim.
        </p>
      )}
    </div>
  );
}

function Verdict({ scan }: { scan: ConditionScan }) {
  const badge = scanBadge(scan);
  if (scan.status === "PROCESSING") {
    return (
      <div className="space-y-2" role="status">
        <Badge variant={badge.tone}>{badge.label}</Badge>
        <p className="body-copy">
          The AI is comparing the return photos with the earlier ones. This
          usually takes a few minutes; this page updates by itself.
        </p>
      </div>
    );
  }
  if (scan.status === "FAILED") {
    return (
      <div
        className="rounded-lg border-l-2 border-accent bg-accent-soft px-4 py-3"
        role="alert"
      >
        <p className="font-medium text-ink">
          The AI couldn&apos;t finish this check
        </p>
        <p className="mt-1 text-sm text-ink">{scan.failure_reason}</p>
      </div>
    );
  }

  const found = scan.angles.flatMap((angle) =>
    angle.findings.map((finding) => ({ angle, finding })),
  );
  const damage = found.filter(({ finding }) => !finding.is_wear);
  const wear = found.filter(({ finding }) => finding.is_wear);
  const skipped = scan.angles.filter(
    (angle) =>
      angle.status === "NOT_COMPARED" || angle.status === "NOT_APPLICABLE",
  );
  const clear = scan.verdict === "CLEAR";
  return (
    <section
      aria-labelledby="verdict-heading"
      className={`space-y-3 rounded-lg border-l-2 px-4 py-4 ${clear ? "border-success bg-success-soft" : "border-accent bg-accent-soft"}`}
    >
      <h2 id="verdict-heading" className="font-semibold text-ink">
        {clear
          ? "No damage found"
          : `Possible damage found in ${damage.length} place${damage.length === 1 ? "" : "s"}`}
      </h2>
      {damage.length > 0 && <FindingList items={damage} />}
      {wear.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">
            Normal wear (not damage)
          </p>
          <FindingList items={wear} />
        </div>
      )}
      {skipped.length > 0 && (
        <p className="text-sm text-ink-soft">
          Not checked:{" "}
          {skipped.map((angle) => angle.label.toLowerCase()).join(", ")}. See
          below for why.
        </p>
      )}
      <p className="text-sm text-ink">
        {clear
          ? "Nothing to do: the deposit is released as usual once the claim window closes."
          : "Next: check these spots on the item yourself, then decide whether to report damage before the claim window closes."}
      </p>
    </section>
  );
}

function FindingList({
  items,
}: {
  items: { angle: ScanAngle; finding: ScanAngle["findings"][number] }[];
}) {
  return (
    <ul className="mt-1 space-y-1 text-sm text-ink">
      {items.map(({ angle, finding }) => (
        <li key={`${angle.angle}-${finding.number}`} className="flex gap-2">
          <span aria-hidden>•</span>
          <span>
            <span className="font-medium">
              {angle.label} #{finding.number} · {findingLabel(finding)}
            </span>{" "}
            — {finding.summary}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AngleReport({ angle }: { angle: ScanAngle }) {
  const shown = angle.status === "COMPARED" || angle.status === "MODEL_ONLY";
  return (
    <section aria-labelledby={`angle-${angle.angle}`} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`angle-${angle.angle}`} className="heading text-xl">
          {angle.label}
        </h2>
        {shown && angle.anomaly_score != null && (
          <p className="text-xs text-ink-soft">
            Difference score {angle.anomaly_score.toFixed(2)}
          </p>
        )}
      </div>
      {angle.note && <p className="text-sm text-ink-soft">{angle.note}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Photo
          url={angle.reference_photo_url}
          caption={
            angle.reference
              ? `Before · ${referenceLabel(angle.reference)}`
              : "Before"
          }
        />
        <Photo url={angle.return_photo_url} caption="After · Return photo" />
        <Photo
          url={angle.diff_map_url}
          caption={
            angle.status === "MODEL_ONLY"
              ? "Where the AI saw changes"
              : "Differences highlighted"
          }
        />
      </div>
      {shown &&
        (angle.findings.length > 0 ? (
          <ol className="space-y-2">
            {angle.findings.map((finding) => (
              <li
                key={finding.number}
                className="flex gap-3 border border-line px-3 py-2 text-sm"
              >
                <span className="font-semibold">{finding.number}</span>
                <span>
                  <span className="font-medium">{findingLabel(finding)}</span>
                  {finding.confidence != null && (
                    <span className="text-ink-soft">
                      {" "}
                      · {Math.round(finding.confidence * 100)}% sure
                    </span>
                  )}
                  <span className="block text-ink">{finding.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-soft">
            No changes found on this side.
          </p>
        ))}
    </section>
  );
}

function Photo({ url, caption }: { url: string | null; caption: string }) {
  return (
    <figure>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived presigned URL
        <img
          src={url}
          alt={caption}
          className="aspect-[4/3] w-full border border-line bg-surface-muted object-contain"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center border border-line bg-surface-muted text-xs text-ink-soft">
          Not available
        </div>
      )}
      <figcaption className="mt-1 text-xs text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
