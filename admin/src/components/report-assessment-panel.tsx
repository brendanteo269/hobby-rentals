import { Badge, Panel } from "./ui";
import { formatDateTime } from "@/lib/format";
import {
  AI_SIGNAL_LABELS,
  AI_SUGGESTION_LABELS,
  PRIORITY,
  type Priority,
  type ReportAssessment,
} from "@/lib/moderation";

function severityPriority(severity: number): Priority {
  return severity >= 4 ? "HIGH" : severity === 3 ? "MEDIUM" : "LOW";
}

/**
 * What the model made of a report: advice for the person deciding, never the
 * decision. Shows what it suggests, how sure it was, how serious it judged the
 * report, the signals it found and its reasoning; the messages it relied on are
 * marked in the conversation below. A report it could not assess is simply
 * left to the administrator.
 */
export function ReportAssessmentPanel({ assessment }: { assessment: ReportAssessment | null }) {
  if (!assessment) return null;

  if (assessment.status !== "DONE" || !assessment.suggestion) {
    return (
      <Panel title="AI assessment">
        <p className="text-sm text-ink-soft">
          {assessment.status === "PROCESSING"
            ? "Being assessed. You can decide without it."
            : "The assessment could not be completed. This report is for you to decide."}
        </p>
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
