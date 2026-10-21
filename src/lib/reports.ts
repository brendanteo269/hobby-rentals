/**
 * S3-21: reporting a listing for an administrator to review. Mirrors
 * app/routers/reports.py; the reasons mirror public.listing_report_reasons().
 * S3-22: reporting a user from a booking conversation, below.
 */

export type ListingReportReason =
  | "SCAM_OR_FRAUD"
  | "MISLEADING"
  | "PROHIBITED_ITEM"
  | "NOT_AVAILABLE"
  | "OFFENSIVE"
  | "OTHER";

/** In the order the form offers them. */
export const LISTING_REPORT_REASONS: { value: ListingReportReason; label: string }[] = [
  { value: "SCAM_OR_FRAUD", label: "It looks like a scam or fraud" },
  { value: "MISLEADING", label: "Misleading photos or description" },
  { value: "PROHIBITED_ITEM", label: "Prohibited or unsafe item" },
  { value: "NOT_AVAILABLE", label: "The item isn't really available" },
  { value: "OFFENSIVE", label: "Offensive or inappropriate content" },
  { value: "OTHER", label: "Something else" },
];

/** What a reporter is told back: never the evidence, which is for administrators. */
export type ListingReport = {
  id: string;
  listing_id: string;
  reason_code: ListingReportReason;
  status: "OPEN" | "DISMISSED" | "ACTIONED";
  created_at: string;
};

export type UserReportReason =
  | "HARASSMENT"
  | "THREATS"
  | "SCAM_OR_FRAUD"
  | "INAPPROPRIATE_CONTENT"
  | "SPAM"
  | "OTHER";

/** Mirrors public.user_report_reasons(), in the order the form offers them. */
export const USER_REPORT_REASONS: { value: UserReportReason; label: string }[] = [
  { value: "HARASSMENT", label: "Harassment or abuse" },
  { value: "THREATS", label: "Threats" },
  { value: "SCAM_OR_FRAUD", label: "Scam or fraud" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Something else" },
];

export function userReportReasonLabel(reason: UserReportReason): string {
  return USER_REPORT_REASONS.find((option) => option.value === reason)?.label ?? reason;
}

/**
 * A user report goes to an administrator first. OPEN is under review; ACTIONED
 * means the claim was upheld and has been sent to the person reported;
 * DISMISSED means it was not, and they never see it.
 */
export type UserReportStatus = "OPEN" | "DISMISSED" | "ACTIONED";

/** One line for the reporter on where their report stands. */
export const USER_REPORT_STATUS_LINES: Record<UserReportStatus, string> = {
  OPEN: "Our team is reviewing this. The person you reported is told only if we find it to be valid.",
  ACTIONED: "Our team reviewed this and took action. The person you reported has been sent it.",
  DISMISSED: "Our team reviewed this and found no grounds to act. The person you reported was not told.",
};

/** What the reporter is told back after reporting; the evidence is read from the report itself. */
export type UserReportReceipt = {
  id: string;
  reason_code: UserReportReason;
  status: UserReportStatus;
  created_at: string;
};

export type ReportParty = { id: string; display_name: string | null; role: "RENTER" | "OWNER" };

export type ReportMessage = {
  id: string;
  from: "REPORTER" | "REPORTED";
  body: string;
  sent_at: string;
  /** Short-lived signed URLs: attachments are never publicly readable. */
  attachment_urls: string[];
};

/**
 * A user report with its evidence bundle, read-only, as GET /reports/{id}
 * answers. `viewer` is who is reading it: the reporter or the person reported.
 */
export type UserReport = {
  id: string;
  viewer: "REPORTER" | "REPORTED" | "ADMIN";
  reason_code: UserReportReason;
  /** Null for the person reported: they are given the general cause, not what the reporter wrote. */
  explanation: string | null;
  status: UserReportStatus;
  created_at: string;
  /** When an administrator decided it; null while it awaits them. */
  resolved_at: string | null;
  captured_at: string | null;
  /** Null for the person reported: the report reaches them anonymously. */
  reporter: ReportParty | null;
  reported: ReportParty;
  /** Null, with no conversation, for the person reported: they get the cause and the date only. */
  booking: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    listing_id: string;
    listing_name: string | null;
  } | null;
  conversation_id: string | null;
  messages: ReportMessage[];
};

/** Where a report is read; the notification to the reported user links here too. */
export function userReportPath(reportId: string): `/reports/${string}` {
  return `/reports/${reportId}`;
}

/**
 * What to tell a member whose report was upheld (S3-23): what is expected of
 * them, in terms that hold whatever they were reported for. Shown with the
 * report they are sent. Deliberately says nothing of strikes or how many there
 * are - that is for administrators - only what is expected.
 */
export const USER_REPORT_ADVICE =
  "Please keep every conversation on HobbyRentals respectful, honest and about the booking. Don't harass, threaten or pressure other members, ask anyone to pay or hand over money outside the app, or send offensive or unrelated messages.";

/** Said after the advice: where to go instead, and what further valid reports can mean. */
export const USER_REPORT_ADVICE_CLOSING =
  "If something goes wrong with a booking, contact support instead of taking it up with the other person. Further reports that our team finds to be valid can lead to restrictions on your account.";
