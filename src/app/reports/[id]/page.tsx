import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ReportEvidence } from "@/components/reports/report-evidence";
import { BackendApiError } from "@/lib/api/client";
import { getUserReport } from "@/lib/api/reports";
import { USER_REPORT_STATUS_LINES } from "@/lib/reports";

export const metadata = { title: "Report — HobbyRentals" };

/**
 * S3-22: a user report's evidence, read-only, for the person who made it and
 * the person it is about. Anyone else, and an unknown report, is a 404.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let report;
  try {
    report = await getUserReport(id);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">{report.viewer === "REPORTED" ? "A report about you" : "Your report"}</p>
        <h1 className="heading mt-3 text-3xl">Report on a booking conversation</h1>
        <p className="body-copy mt-2">
          {report.viewer === "REPORTED"
            ? "Our team reviewed a report made about you and found it to be valid. This page is read-only."
            : `${USER_REPORT_STATUS_LINES[report.status]} This page is read-only.`}
        </p>
        <div className="mt-10">
          <ReportEvidence report={report} />
        </div>
      </div>
    </Container>
  );
}
