import { Badge } from "./ui";
import { ProgressBar } from "./progress-bar";
import { RefreshWhile } from "./refresh-while";
import { AI_SIGNAL_LABELS, AI_SUGGESTION_LABELS, PRIORITY, type Priority, type ReportAssessment } from "@/lib/moderation";

function severityPriority(severity: number): Priority {
  return severity >= 4 ? "HIGH" : severity === 3 ? "MEDIUM" : "LOW";
}

/**
 * What the model made of a report, in a few lines inside the report it
 * concerns: advice for the person deciding, never the decision. A report it
 * could not assess just says so and is left to the administrator.
 */
export function ReportAssessmentSummary({ assessment }: { assessment: ReportAssessment | null | undefined }) {
  if (!assessment) return null;

  if (assessment.status === "PROCESSING") {
    return (
      <div className="space-y-1.5">
        <RefreshWhile active />
        <ProgressBar
          label={assessment.attempts === 0 ? "Waiting for the assessment to start" : "Assessing the report"}
          percent={assessment.attempts === 0 ? 10 : undefined}
        />
        <p className="text-xs text-ink-soft">
          AI assessment: {assessment.attempts === 0 ? "queued, waiting for the worker." : "assessing…"} You can decide without it.
        </p>
      </div>
    );
  }

  if (assessment.status !== "DONE" || !assessment.suggestion) {
    return <p className="text-xs text-ink-soft">AI assessment: couldn&apos;t be completed. This is for you to decide.</p>;
  }

  const severity = assessment.severity ?? 1;
  const raised = Object.entries(assessment.signals).filter(([, present]) => present);
  return (
    <div className="space-y-1.5 border-l-2 border-line bg-sand px-3 py-2 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">AI assessment · advice only</span>
        <span className="font-medium">{AI_SUGGESTION_LABELS[assessment.suggestion]}</span>
        <span className="text-ink-soft">{Math.round((assessment.confidence ?? 0) * 100)}% confident</span>
        <Badge tone={PRIORITY[severityPriority(severity)].tone}>Severity {severity} of 5</Badge>
        {raised.map(([name]) => (
          <Badge key={name} tone="warning">
            {AI_SIGNAL_LABELS[name] ?? name}
          </Badge>
        ))}
      </p>
      {assessment.reasoning && <p className="whitespace-pre-line">{assessment.reasoning}</p>}
      {assessment.cited_messages.length > 0 && (
        <p className="text-xs text-ink-soft">
          Relied on message{assessment.cited_messages.length === 1 ? "" : "s"} {assessment.cited_messages.join(", ")}.
          {assessment.model ? ` ${assessment.model}.` : ""}
        </p>
      )}
    </div>
  );
}
