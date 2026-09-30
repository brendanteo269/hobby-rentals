import { ButtonLink } from "@/components/ui";
import { newBookingConversationPath, newListingConversationPath } from "@/lib/routes";

type Target = { kind: "listing"; listingId: string } | { kind: "booking"; bookingId: string };

/**
 * The one "start a conversation" entry point, wherever it's offered - a
 * listing's detail page, an owner's booking list, a renter's profile.
 * Building the right /messages/new link is what actually varied between
 * those three call sites; the button itself never did.
 */
export function MessageButton({
  target,
  label = "Message",
  className,
}: {
  target: Target;
  label?: string;
  /** Defaults to no size override, matching a plain Button/ButtonLink - pass the compact "px-3 py-1.5 text-xs" size to sit flush with the small action buttons in a list row. */
  className?: string;
}) {
  const href = target.kind === "listing" ? newListingConversationPath(target.listingId) : newBookingConversationPath(target.bookingId);
  return (
    <ButtonLink href={href} variant="outline" className={className}>
      {label}
    </ButtonLink>
  );
}
