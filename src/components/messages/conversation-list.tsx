"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageSlot } from "@/components/ui";
import { conversationPriceLocationLine, type Conversation } from "@/lib/conversations";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings";
import { formatChatTimestamp, formatDate } from "@/lib/format";
import { PersonAvatar } from "./person-avatar";

type Tab = "LISTING" | "BOOKING";
const TABS: { tab: Tab; label: string }[] = [
  { tab: "LISTING", label: "Enquiries" },
  { tab: "BOOKING", label: "Bookings" },
];

/**
 * Which tab opens by default. A specific thread already being viewed wins
 * outright - show the tab it actually lives on. Otherwise, land on whichever
 * side has something unread, but only when that's unambiguous: if both sides
 * do (or neither does), there's no single "correct" tab to jump to, so it
 * falls back to Enquiries rather than guessing.
 */
function defaultTab(conversations: Conversation[], activeId?: string): Tab {
  const active = conversations.find((c) => c.id === activeId);
  if (active) return active.scope;

  const unreadOnListing = conversations.some((c) => c.scope === "LISTING" && c.unread);
  const unreadOnBooking = conversations.some((c) => c.scope === "BOOKING" && c.unread);
  if (unreadOnListing && !unreadOnBooking) return "LISTING";
  if (unreadOnBooking && !unreadOnListing) return "BOOKING";
  return "LISTING";
}

/**
 * The inbox's thread list, shared by the list-only and open-thread routes.
 *
 * Enquiries and bookings are a tab switch, not two stacked sections: once
 * either side has more than a handful of threads the stacked version just
 * became a very long page to scroll through to find one. A client component
 * for that reason alone - which tab is active is pure view state, nothing
 * to do with routing or server data.
 */
export function ConversationList({ conversations, activeId }: { conversations: Conversation[]; activeId?: string }) {
  const [tab, setTab] = useState<Tab>(() => defaultTab(conversations, activeId));
  const shown = conversations.filter((c) => c.scope === tab);

  return (
    <div>
      <div className="sticky top-0 z-10 flex border-b border-line bg-white">
        {TABS.map(({ tab: t, label }) => {
          const unreadCount = conversations.filter((c) => c.scope === t && c.unread).length;
          const isActive = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {label}
              {unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread`}
                  className="flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[0.6875rem] font-semibold leading-none text-white"
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="body-copy p-6 text-center text-sm">
          {tab === "LISTING" ? "No enquiries yet." : "No bookings yet."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} active={conversation.id === activeId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({ conversation, active }: { conversation: Conversation; active: boolean }) {
  const subtitle =
    conversation.scope === "BOOKING" && conversation.booking_start_date && conversation.booking_end_date
      ? `${formatDate(conversation.booking_start_date)} – ${formatDate(conversation.booking_end_date)}` +
        (conversation.booking_status ? ` · ${BOOKING_STATUS_LABELS[conversation.booking_status]}` : "")
      : conversationPriceLocationLine(conversation);

  return (
    <li>
      <Link
        href={`/messages/${conversation.id}`}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${active ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
      >
        <div className="relative shrink-0">
          <ImageSlot label={conversation.listing_name} src={conversation.listing_photo_url ?? undefined} className="size-14 rounded-xl" />
          <div className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-white">
            <PersonAvatar name={conversation.other_party_name} size="sm" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`truncate text-sm ${conversation.unread ? "font-semibold text-ink" : "text-ink"}`}>
              {conversation.listing_name}
            </p>
            <span className="shrink-0 text-xs text-ink-soft">{formatChatTimestamp(conversation.updated_at)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-ink-soft">{subtitle}</p>
            {conversation.unread && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />}
          </div>
        </div>
      </Link>
    </li>
  );
}
