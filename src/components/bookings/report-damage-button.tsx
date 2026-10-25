"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormNotice, Modal, SelectField, TextareaField } from "@/components/ui";
import { reportBundleDamageAction } from "@/app/bookings/actions";
import { dollarsToCents, formatDateTime } from "@/lib/format";

/**
 * S3-10: the owner reports damage to a returned bundle while its claim window
 * is open, picking the damaged item, whose passport records the outcome.
 * Reporting holds the whole bundle - the owner's payout and the renter's
 * deposit - until an admin decides, which the dialog says before the owner
 * confirms. Bundles only: a single booking is claimed from its condition
 * page, where the renter can accept or dispute.
 */
export function ReportDamageButton({
  id,
  windowEndsAt,
  items,
}: {
  /** The bundle booking. */
  id: string;
  windowEndsAt: string;
  /** The bundle's items, to choose the damaged one from. */
  items: { listing_id: string; listing_name: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [listingId, setListingId] = useState(items[0]?.listing_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const claimedCents = dollarsToCents(amount);
    if (!description.trim()) return setError("Describe the damage.");
    if (claimedCents === null || !Number.isFinite(claimedCents) || claimedCents <= 0) {
      return setError("Enter what the damage would cost to put right.");
    }
    setError(null);
    startTransition(async () => {
      const result = await reportBundleDamageAction(id, listingId, description.trim(), claimedCents);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
        Report damage
      </Button>
      {open && (
        <Modal title="Report damage" onClose={() => setOpen(false)}>
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-ink-soft">
              Reporting holds this rental&apos;s funds - your payout and the renter&apos;s deposit - until the platform
              reviews the claim and decides the damage value. You can report until {formatDateTime(windowEndsAt)}.
            </p>
            {items.length > 0 && (
              <SelectField
                id="damage-item"
                label="Damaged item"
                value={listingId}
                onChange={(event) => setListingId(event.target.value)}
                required
              >
                {items.map((item) => (
                  <option key={item.listing_id} value={item.listing_id}>
                    {item.listing_name ?? "An item"}
                  </option>
                ))}
              </SelectField>
            )}
            <TextareaField
              id="damage-description"
              label="What is damaged"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
            <Field
              id="damage-amount"
              label="Repair or replacement cost (S$)"
              hint="Your estimate. The platform decides the final figure."
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <FormNotice message={error ?? undefined} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={isPending} onClick={submit}>
                {isPending ? "Reporting…" : "Report damage"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
