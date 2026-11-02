"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormNotice, Modal, TextareaField } from "@/components/ui";
import { ButtonLink } from "@/components/ui";
import { offerListing } from "@/app/requests/actions";
import { formatMoney } from "@/lib/format";
import type { OfferedListing } from "@/lib/gear-requests";

/**
 * S5-13 Scenario 3: the owner answering a request.
 *
 * Both halves of "offer one of your listings, or create a new listing from
 * the request" are here, because an owner who has the thing but has never
 * listed it is exactly who this story is for - and a dead end at that point
 * would lose them.
 *
 * Archived listings are offerable and marked as such. Offering one is how an
 * owner puts a shelved listing back in front of the person who wants it,
 * which is the reason the matching looks at archived listings at all.
 */
export function OfferListingPanel({
  requestId,
  listings,
  alreadyOffered,
}: {
  requestId: string;
  listings: OfferedListing[];
  alreadyOffered: string[];
}) {
  const router = useRouter();
  const offered = new Set(alreadyOffered);
  const available = listings.filter((listing) => !offered.has(listing.id));
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  // S5-13: the archived listing that was just offered, if it was one. The
  // offer is sent either way - the renter has been told about it - but they
  // cannot book an archived listing, so the owner is told that here rather
  // than finding out when the renter hits a refusal.
  const [archivedOffer, setArchivedOffer] = useState<OfferedListing | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    // Captured before the offer clears the choice: once the request
    // refreshes, this listing has moved out of the list of what is left.
    const offeredListing = available.find((listing) => listing.id === selected);
    startTransition(async () => {
      const result = await offerListing(requestId, selected, message);
      if ("error" in result) setError(result.error);
      else {
        setSelected("");
        setMessage("");
        if (offeredListing?.status === "ARCHIVED") setArchivedOffer(offeredListing);
        router.refresh();
      }
    });
  }

  return (
    <section aria-labelledby="offer-heading" className="card p-6">
      <h2 id="offer-heading" className="heading text-xl">Offer one of your listings</h2>

      {available.length === 0 ? (
        <>
          <p className="body-copy mt-2">
            {listings.length === 0
              ? "You have nothing listed yet. If you own one of these, list it and offer it here."
              : "You have offered everything you have that could suit this."}
          </p>
          <div className="mt-4">
            <ButtonLink href="/listings/new" variant="outline">Create a listing</ButtonLink>
          </div>
        </>
      ) : (
        <>
          <p className="body-copy mt-2">
            The renter is told straight away, with a link that opens your listing on the dates they
            asked for.
          </p>

          <ul className="mt-5 space-y-2">
            {available.map((listing) => (
              <li key={listing.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-ink">
                  {/* onClick as well as onChange, so a second click clears
                      the choice. A radio fires no change event when it is
                      already checked, and a group with no way back out traps
                      an owner who picked the wrong listing - the click lands
                      before the change, so choosing another one still
                      works. */}
                  <input
                    type="radio"
                    name="listing"
                    value={listing.id}
                    checked={selected === listing.id}
                    onClick={() => selected === listing.id && setSelected("")}
                    onChange={() => setSelected(listing.id)}
                    className="size-4 accent-ink"
                  />
                  <span>
                    <span className="font-medium">{listing.name}</span>
                    {listing.price_per_day_cents != null && (
                      <span className="text-ink-soft"> · {formatMoney(listing.price_per_day_cents)} / day</span>
                    )}
                    {listing.status === "ARCHIVED" && (
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        Archived listing. Unarchive it so that renter can book it.
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <TextareaField
              label="Add a note (optional)"
              id="offer-message"
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Happy to lend it. It comes with a spare battery."
            />
          </div>

          <FormNotice message={error ?? undefined} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button disabled={isPending || !selected} onClick={submit}>
              {isPending ? "Offering…" : "Offer this listing"}
            </Button>
            <ButtonLink href="/listings/new" variant="outline">Create a new listing instead</ButtonLink>
            {/* A disabled button with no reason beside it reads as a broken
                one. Say what is missing rather than leaving the owner to
                guess whether they clicked it wrong. */}
            {!selected && !isPending && (
              <p className="text-sm text-ink-soft">Choose one of your listings above first.</p>
            )}
          </div>
        </>
      )}
      {archivedOffer && (
        <Modal title="Restore it so they can book it" onClose={() => setArchivedOffer(null)}>
          <p className="body-copy mt-4">
            Your offer has been sent, and the renter can see it. But{" "}
            <span className="font-medium text-ink">{archivedOffer.name}</span> is archived, and an
            archived listing cannot be booked. They will be turned away when they try.
          </p>
          <p className="body-copy mt-3">
            Restore it from your listings and it is bookable again straight away.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setArchivedOffer(null)}>
              Not now
            </Button>
            <ButtonLink href={`/listings/mine#listing-${archivedOffer.id}` as Route}>
              Restore this listing
            </ButtonLink>
          </div>
        </Modal>
      )}
    </section>
  );
}
