import type { ReactNode } from "react";
import { Badge, FormNotice } from "@/components/ui";
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
  if (scan.status === "COMPLETED" && scan.verdict === "CLEAR") {
    return (
      <FormNotice tone="success" message={scan.summary ?? "No damage found."} />
    );
  }
  return (
    <div
      className="rounded-lg border-l-2 border-accent bg-accent-soft px-4 py-3"
      role="alert"
    >
      <p className="font-medium text-ink">
        {scan.status === "FAILED"
          ? "The AI couldn't finish this check"
          : "Possible damage found"}
      </p>
      <p className="mt-1 text-sm text-ink">
        {scan.status === "FAILED" ? scan.failure_reason : scan.summary}
      </p>
    </div>
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
