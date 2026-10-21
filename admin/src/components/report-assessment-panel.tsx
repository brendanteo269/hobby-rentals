import { Badge, Panel } from "./ui";
import { ProgressBar } from "./progress-bar";
import { RefreshWhile } from "./refresh-while";
import { formatDateTime } from "@/lib/format";
import {
  AI_SIGNAL_LABELS,
  AI_SUGGESTION_LABELS,
  ASSESSMENT_MAX_ATTEMPTS,
  ASSESSMENT_STALLED_AFTER_SECONDS,
  PRIORITY,
  type Priority,
  type ReportAssessment,
} from "@/lib/moderation";

function severityPriority(severity: number): Priority {
  return severity >= 4 ? "HIGH" : severity === 3 ? "MEDIUM" : "LOW";
}

/**
 * What the model made of a report, as a section of its own: advice for the
 * person deciding, never the decision. Shows what it suggests, how sure it
 * was, how serious it judged the report, the signals it found and its
 * reasoning; the messages it relied on are marked in the conversation. A
 * report it could not assess is simply left to the administrator.
 */
export function ReportAssessmentPanel({ assessment }: { assessment: ReportAssessment | null | undefined }) {
  if (!assessment) return null;

  if (assessment.status === "PROCESSING") return <AssessmentProgress assessment={assessment} />;

  if (assessment.status !== "DONE" || !assessment.suggestion) {
    return (
      <Panel title="AI assessment">
        <p className="text-sm text-ink-soft">The assessment could not be completed. This report is for you to decide.</p>
      </Panel>
    );
  }

  const raised = Object.entries(assessment.signals).filter(([, present]) => present);
  const severity = assessment.severity ?? 1;
  return (
    <Panel
      title="AI assessment"
      description={`Advice only. ${assessment.model ?? "The model"}${assessment.completed_at ? `, ${formatDateTime(assessment.completed_at)}` : ""}.`}
    >
      <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Suggests</dt>
          <dd className="mt-1.5 font-medium">{AI_SUGGESTION_LABELS[assessment.suggestion]}</dd>
        </div>
        <div>
          <dt className="eyebrow">Confidence</dt>
          <dd className="mt-1.5">{Math.round((assessment.confidence ?? 0) * 100)}%</dd>
        </div>
        <div>
          <dt className="eyebrow">Severity</dt>
          <dd className="mt-1.5 flex items-center gap-2">
            {severity} of 5 <Badge tone={PRIORITY[severityPriority(severity)].tone}>{PRIORITY[severityPriority(severity)].label}</Badge>
          </dd>
        </div>
      </dl>

      {raised.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="eyebrow">Signals</span>
          {raised.map(([name]) => (
            <Badge key={name} tone="warning">
              {AI_SIGNAL_LABELS[name] ?? name}
            </Badge>
          ))}
        </p>
      )}

      {assessment.reasoning && <p className="mt-4 whitespace-pre-line text-sm">{assessment.reasoning}</p>}
      {assessment.cited_messages.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          Relied on message{assessment.cited_messages.length === 1 ? "" : "s"} {assessment.cited_messages.join(", ")}.
        </p>
      )}
    </Panel>
  );
}

/**
 * An assessment that is not finished yet, with a bar that says where it is:
 * waiting for a worker to pick it up, or being worked on. The model gives no
 * percentage, so the second is a moving bar rather than a fill. The page
 * refreshes itself until it is done, so the result appears without a reload.
 */
function AssessmentProgress({ assessment }: { assessment: ReportAssessment }) {
  const waiting = assessment.attempts === 0;
  const stalled = waiting && assessment.queued_seconds > ASSESSMENT_STALLED_AFTER_SECONDS;
  return (
    <Panel title="AI assessment" description="Advice only. You can decide without it.">
      <RefreshWhile active />
      <div className="space-y-3">
        {waiting ? (
          <ProgressBar percent={10} label="Waiting for the assessment to start" />
        ) : (
          <ProgressBar label="Assessing the report" />
        )}
        <p className="text-sm">
          {waiting
            ? "Queued, waiting for the assessment worker."
            : `Assessing the conversation${assessment.attempts > 1 ? ` (attempt ${assessment.attempts} of ${ASSESSMENT_MAX_ATTEMPTS})` : ""}…`}
        </p>
        {stalled && (
          <p className="text-xs text-ink-soft">
            It has been waiting a few minutes. The assessment worker may not be running, in which case this report is for you to decide.
          </p>
        )}
      </div>
    </Panel>
  );
}
