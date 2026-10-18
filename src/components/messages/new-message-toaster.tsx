"use client";

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { usePolling } from "@/components/use-polling";
import { findNewActivity, type ConversationActivity } from "@/lib/conversations";

const POLL_MS = 8_000;
const MESSAGES_PATH = "/messages";

/**
 * Renders nothing; polls the member's conversations from any page and raises
 * a toast ("N new messages") when something new arrives from the other side.
 *
 * The first poll only records a baseline, so unread threads the member
 * already knew about on page load don't toast. A thread currently open is
 * skipped (its own panel shows the message live, and marks it read), and
 * while on /messages the server-rendered thread list is refreshed so its
 * unread dots and ordering keep up.
 */
export function NewMessageToaster() {
  const { show } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const seen = useRef<Map<string, string> | null>(null);
  const inFlight = useRef(false);

  usePolling(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch("/api/conversations/updates", { cache: "no-store" });
      if (!response.ok) return;
      const current = (await response.json()) as ConversationActivity[];

      const baseline = seen.current;
      seen.current = new Map(current.map((c) => [c.id, c.updated_at]));
      if (!baseline) return;

      const openId = pathname.startsWith(`${MESSAGES_PATH}/`) ? pathname.split("/")[2] : null;
      const fresh = findNewActivity(current, baseline).filter((c) => c.id !== openId);
      if (fresh.length === 0) return;

      show(
        fresh.length === 1
          ? `${fresh[0].other_party_name ?? "Someone"} sent you a new message`
          : `${fresh.length} new messages`,
      );
      if (pathname.startsWith(MESSAGES_PATH)) router.refresh();
    } catch {
      // A failed poll (offline, backend blip) is retried on the next tick; a toast about it would be noise.
    } finally {
      inFlight.current = false;
    }
  }, POLL_MS);

  return null;
}
