import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Badge, ButtonLink, ImageSlot } from "@/components/ui";
import { BOOKING_STATUS_BADGE_VARIANT, BOOKING_STATUS_LABELS } from "@/lib/bookings";
import { KIT_STATUS_LABELS, kitFailureMessage, pendingItemCount, type Kit, type KitItem } from "@/lib/booking-groups";
import { formatDateRange, formatMoney } from "@/lib/format";
import { RENTER_BOOKINGS_PATH, rebuildKitPath } from "@/lib/routes";
import { WithdrawKitButton } from "./withdraw-kit-button";

/**
 * One cross-owner kit as the renter follows it (S5-09 Scenario 4): every
 * owner's item with its own status in one view, and the next step for the kit
 * as a whole. An item is still an ordinary booking, so its meetup, pickup,
 * return and settlement happen on its own row in Bookings, linked from here.
 */
export function KitDetail({ kit }: { kit: Kit }) {
  const waiting = pendingItemCount(kit);
  const anyAccepted = kit.items.some((item) => item.status !== "PENDING");
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="heading text-2xl">{kit.activity ?? "Your bundle"}</h2>
          <Badge variant={kit.status === "CONFIRMED" ? "success" : kit.status === "FAILED" ? "neutral" : "warning"}>
            {KIT_STATUS_LABELS[kit.status]}
          </Badge>
        </div>
        <p className="body-copy mt-1">
          {formatDateRange(kit.start_date, kit.end_date)} · {kit.items.length} {kit.items.length === 1 ? "item" : "items"} ·{" "}
          {formatMoney(kit.total_amount_cents)} in total
        </p>
      </header>

      {kit.failure && <KitFailureBanner kit={kit} />}

      {kit.status === "PENDING" && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
          <p className="body-copy">
            {waiting} of {kit.items.length} {kit.items.length === 1 ? "answer is" : "answers are"} still to come. If any owner
            declines or does not answer in time, the whole bundle is cancelled and every hold is released.
          </p>
          {!anyAccepted && <WithdrawKitButton kitId={kit.id} />}
        </div>
      )}

      <ul className="space-y-4">
        {kit.items.map((item) => (
          <KitItemCard key={item.booking_id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function KitFailureBanner({ kit }: { kit: Kit }) {
  if (!kit.failure) return null;
  return (
    <div role="alert" className="card border-accent p-4">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 text-accent-dark" aria-hidden="true" />
        {kitFailureMessage(kit.failure)}
      </p>
      {kit.rebuild && (
        <div className="mt-3">
          <ButtonLink href={rebuildKitPath(kit.id)}>
            Rebuild without {kit.failure.listing_name ?? "it"}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function KitItemCard({ item }: { item: KitItem }) {
  return (
    <li id={`booking-${item.booking_id}`} className="card flex items-start gap-3 p-4">
      <ImageSlot
        label={item.listing_name ?? "Item"}
        src={item.primary_photo_url ?? undefined}
        className="size-16 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <Link href={`/listings/${item.listing_id}`} className="font-medium hover:underline">
          {item.listing_name ?? "Item"}
        </Link>
        <p className="body-copy mt-0.5 text-xs">{item.owner_name ?? "Owner"}</p>
        <p className="mt-2">
          <Badge variant={BOOKING_STATUS_BADGE_VARIANT[item.status]}>{BOOKING_STATUS_LABELS[item.status]}</Badge>
        </p>
        {(item.status === "CONFIRMED" || item.status === "ACTIVE" || item.status === "COMPLETED") && (
          <Link
            href={`${RENTER_BOOKINGS_PATH}#booking-${item.booking_id}`}
            className="mt-2 block w-fit text-sm font-medium underline underline-offset-4"
          >
            Meetup, pickup and return
          </Link>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold">{item.total_amount_cents !== null ? formatMoney(item.total_amount_cents) : ""}</p>
    </li>
  );
}
