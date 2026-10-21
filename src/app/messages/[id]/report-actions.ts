"use server";

import { BackendApiError } from "@/lib/api/client";
import { reportUser } from "@/lib/api/reports";
import type { UserReportReason } from "@/lib/reports";

export type ReportUserResult = { error: string; code?: string } | { reported: true; reportId: string };

/** S3-22: a party to a booking conversation reports the other, with the conversation attached as evidence. */
export async function submitUserReport(
  conversationId: string,
  reason: UserReportReason,
  explanation: string,
): Promise<ReportUserResult> {
  const text = explanation.trim();
  if (!text) return { error: "Tell us what happened." };
  try {
    const receipt = await reportUser(conversationId, reason, text);
    return { reported: true, reportId: receipt.id };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
