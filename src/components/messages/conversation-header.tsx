import Link from "next/link";
import type { Route } from "next";
import { Badge, ImageSlot } from "@/components/ui";
import { CONVERSATION_ROLE_BADGE_VARIANT, CONVERSATION_ROLE_LABELS, type ConversationRole } from "@/lib/conversations";
import { BOOKING_STATUS_BADGE_VARIANT, BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings";
import { formatDate } from "@/lib/format";
import { PersonAvatar } from "./person-avatar";

/**
 * The listing a thread is about - what the row/page is actually recognised
 * by, since the other party's name rarely is (Carousell-style: you remember
 * what you're messaging about, not who). Shared by the open-thread page and
 * the "start a new thread" screen, which has the same listing context before
 * any conversation record exists yet.
 */
export function ConversationHeader({
  listingId,
  photoUrl,
  listingName,
  priceLocation,
  booking,
  otherPartyId,
  otherPartyName,
  otherPartyRole,
}: {
  listingId: string;
  photoUrl: string | null;
  listingName: string;
  priceLocation: string;
  /**
   * Set whenever a booking is attached to this thread - its own booking, or
   * the one a listing enquiry led to - so the thread shows where that
   * booking currently stands (Pending, Confirmed, ...) rather than the
   * viewer having to go check the booking itself.
   */
  booking?: { status: BookingStatus; startDate: string; endDate: string } | null;
  /** Present for an existing thread, so the participant can open their public profile. */
  otherPartyId?: string;
  /** Omitted on the "start a new thread" screen, where no other party has been resolved yet. */
  otherPartyName?: string | null;
  otherPartyRole: ConversationRole;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3">
      <Link
        href={`/listings/${listingId}`}
        className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-ink-soft"
      >
        <ImageSlot label={listingName} src={photoUrl ?? undefined} className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{listingName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {priceLocation && <p className="truncate text-xs text-ink-soft">{priceLocation}</p>}
            {booking && (
              <>
                {priceLocation && <span className="text-xs text-ink-soft">·</span>}
                <p className="truncate text-xs text-ink-soft">
                  {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                </p>
                <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
              </>
            )}
          </div>
        </div>
      </Link>
      {otherPartyId && otherPartyName ? (
        <Link
          href={`/members/${otherPartyId}` as Route}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-1 py-1 transition-colors hover:bg-surface-muted"
          aria-label={`View ${otherPartyName}'s public profile`}
        >
          <PersonAvatar name={otherPartyName} size="sm" />
          <span className="text-xs text-ink-soft">{otherPartyName}</span>
          <Badge variant={CONVERSATION_ROLE_BADGE_VARIANT[otherPartyRole]}>
            {CONVERSATION_ROLE_LABELS[otherPartyRole]}
          </Badge>
        </Link>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          {otherPartyName && <PersonAvatar name={otherPartyName} size="sm" />}
          {otherPartyName && <span className="text-xs text-ink-soft">{otherPartyName}</span>}
          <Badge variant={CONVERSATION_ROLE_BADGE_VARIANT[otherPartyRole]}>
            {CONVERSATION_ROLE_LABELS[otherPartyRole]}
          </Badge>
        </div>
      )}
    </div>
  );
}
