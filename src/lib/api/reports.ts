import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { UserReport, UserReportReason, UserReportReceipt } from "@/lib/reports";

/** Mirrors the user-report routes in app/routers/reports.py (S3-22). */

/**
 * Reports the other party of a booking conversation; the conversation is
 * bundled as evidence. 409 with code ALREADY_REPORTED repeats an open report,
 * NOT_BOOKING_CONVERSATION is a listing enquiry; 429 when reporting too fast.
 */
export function reportUser(conversationId: string, reason: UserReportReason, explanation: string) {
  return backendRequest<UserReportReceipt>(`/conversations/${encodeURIComponent(conversationId)}/reports`, {
    method: "POST",
    body: JSON.stringify({ reason, explanation }),
  });
}

/** A report's evidence, for the person who made it or the person it is about. 404 for anyone else. */
export function getUserReport(reportId: string) {
  return backendRequest<UserReport>(`/reports/${encodeURIComponent(reportId)}`);
}
