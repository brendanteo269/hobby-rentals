/** S6-11 Community Forum: shapes from app/routers/forum.py, and their labels. Client-safe. */
import type { MessageWarning } from "@/lib/conversations";

export type Flair = "QUESTION" | "TIP" | "TRIP_REPORT" | "REVIEW";
export type ForumSort = "hot" | "new" | "top";
export type ForumTargetKind = "POST" | "COMMENT";
export type ForumReportReason = "SPAM" | "HARASSMENT" | "SCAM_OR_FRAUD" | "INAPPROPRIATE_CONTENT" | "OFF_TOPIC" | "OTHER";

export const FLAIRS: Flair[] = ["QUESTION", "TIP", "TRIP_REPORT", "REVIEW"];
export const FLAIR_LABELS: Record<Flair, string> = {
  QUESTION: "Question",
  TIP: "Tip",
  TRIP_REPORT: "Trip Report",
  REVIEW: "Gear Review",
};
export const SORTS: { value: ForumSort; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];
export const REPORT_REASONS: { value: ForumReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam or advertising" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "SCAM_OR_FRAUD", label: "Scam or fraud" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "OFF_TOPIC", label: "Off topic" },
  { value: "OTHER", label: "Something else" },
];

export type ForumSummary = { category_slug: string; label: string; post_count: number; latest_post_at: string | null };

export type GearCard = {
  kind: "LISTING" | "BUNDLE";
  id: string;
  name: string;
  price_per_day_cents: number | null;
  photo_url: string | null;
  href: string;
};

export type ForumPost = {
  id: string;
  category_slug: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  title: string;
  body: string;
  flair: Flair;
  photo_urls: string[];
  gear: GearCard | null;
  score: number;
  comment_count: number;
  my_vote: number;
  created_at: string;
};

export type PostPage = {
  category_slug: string;
  category_label: string;
  posts: ForumPost[];
  total: number;
  page: number;
  page_size: number;
};

export type ForumComment = {
  id: string;
  parent_id: string | null;
  depth: number;
  author_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  body: string;
  score: number;
  my_vote: number;
  removed: boolean;
  created_at: string;
  replies: ForumComment[];
};

export type PostDetail = { post: ForumPost; category_label: string; comments: ForumComment[] };

export type Created = { status: "created"; id: string };
export type Held = { status: "needs_confirmation"; confirmation_id: string; warnings: MessageWarning[] };

export function isSort(value: string): value is ForumSort {
  return value === "hot" || value === "new" || value === "top";
}

export function isFlair(value: string): value is Flair {
  return (FLAIRS as string[]).includes(value);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}
