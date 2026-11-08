"use client";

import { Tag, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormNotice, FormSection, SelectField } from "@/components/ui";
import { addPromoCode, removePromoCode } from "@/app/listings/promo-code-actions";
import { promoDiscountLabel, promoUsesLeft, type PromoCode, type PromoDiscountType } from "@/lib/promo-codes";
import { formatDate } from "@/lib/format";

/**
 * S5-12 Scenario 1: an owner's discount codes, under the availability
 * section of the listing form.
 *
 * Works during creation as well as editing, because the story asks for both.
 * The two differ in when a code reaches the server, not in what the owner
 * does:
 *
 *   * Editing - the listing exists, so each code is saved on its own as soon
 *     as it is added, and deleting one takes effect at once.
 *   * Creating - there is no listing to attach a code to yet, so they are
 *     held here and submitted with the form in a hidden field, the way
 *     initial_blackouts are. The listing is made first and the codes applied
 *     to it, inside the same request.
 */
/** A code written during creation: the request body's shape, nothing more. */
type DraftPromoCode = {
  code: string;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  amount_off_cents: number | null;
  starts_on: string;
  ends_on: string;
  usage_limit: number | null;
};

/** The add-a-code row, as the owner is filling it in. */
type DraftFields = {
  code: string;
  discountType: PromoDiscountType;
  percentOff: string;
  amountOff: string;
  startsOn: string;
  endsOn: string;
  usageLimit: string;
};

const EMPTY_DRAFT: DraftFields = {
  code: "",
  discountType: "PERCENT",
  percentOff: "",
  amountOff: "",
  startsOn: "",
  endsOn: "",
  usageLimit: "",
};

/**
 * One code off the add-a-code row, or the reason it is not one.
 *
 * Checks only what would otherwise fail confusingly later. The backend
 * validates all of it again and is the authority; this is here because the
 * inputs can no longer be `required` - they are not in a form of their own
 * any more, and marking them required would block the listing from saving.
 */
function readDraft(fields: DraftFields): { code: DraftPromoCode } | { error: string } {
  const code = fields.code.trim();
  const percentOff = Number(fields.percentOff);
  const amountOff = Number(fields.amountOff);

  if (code.length < 3) return { error: "A code needs at least three characters." };
  if (fields.discountType === "PERCENT" && (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100)) {
    return { error: "Enter a percentage between 1 and 100." };
  }
  if (fields.discountType === "FIXED" && (!Number.isFinite(amountOff) || amountOff <= 0)) {
    return { error: "Enter the amount to take off." };
  }
  if (!fields.startsOn || !fields.endsOn) return { error: "Give the code a start and an end date." };
  if (fields.endsOn < fields.startsOn) return { error: "The end date cannot be before the start date." };

  return {
    code: {
      code,
      discount_type: fields.discountType,
      percent_off: fields.discountType === "PERCENT" ? Math.round(percentOff) : null,
      amount_off_cents: fields.discountType === "FIXED" ? Math.round(amountOff * 100) : null,
      starts_on: fields.startsOn,
      ends_on: fields.endsOn,
      usage_limit: fields.usageLimit ? Math.round(Number(fields.usageLimit)) : null,
    },
  };
}

export function PromoCodesField({ listingId, codes }: { listingId?: string; codes?: PromoCode[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  //: Codes written while creating, waiting for a listing to belong to.
  const [draftCodes, setDraftCodes] = useState<DraftPromoCode[]>([]);
  const creating = !listingId;
  // Both modes render one list. A draft has no id or usage figures yet, so it
  // borrows its own code as the key - which is also what makes it unique.
  const listed: PromoCode[] = creating
    ? draftCodes.map((draft) => ({
        ...draft,
        id: draft.code,
        listing_id: "",
        times_used: 0,
        created_at: "",
      }))
    : codes ?? [];

  function submit() {
    setError(null);
    const parsed = readDraft(draft);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    const code = parsed.code;

    if (creating) {
      if (draftCodes.some((existing) => existing.code.toUpperCase() === code.code.toUpperCase())) {
        setError("You have already written a code by that name.");
        return;
      }
      setDraftCodes((current) => [...current, code]);
      setDraft(EMPTY_DRAFT);
      return;
    }

    startTransition(async () => {
      const result = await addPromoCode(listingId!, code);
      if ("error" in result) setError(result.error);
      else {
        setDraft(EMPTY_DRAFT);
        router.refresh();
      }
    });
  }

  function remove(codeId: string) {
    setError(null);
    if (creating) {
      setDraftCodes((current) => current.filter((draft) => draft.code !== codeId));
      return;
    }
    startTransition(async () => {
      const result = await removePromoCode(listingId!, codeId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <FormSection title="Promo codes" id="promo-codes">
      <p className="body-copy">
        A renter who types one of these gets it off the rental. The platform fee follows the
        discount down; the security deposit is not discounted.
      </p>

      {/* What the form submits while creating. Empty on edit, where each
          code was saved as it was added. */}
      {creating && <input type="hidden" name="initial_promo_codes" value={JSON.stringify(draftCodes)} />}

      {listed.length > 0 && (
        <ul className="mt-4 space-y-2">
          {listed.map((code) => {
            const left = promoUsesLeft(code);
            return (
              <li key={code.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                <span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Tag className="size-3.5" aria-hidden="true" />
                    {code.code.toUpperCase()}
                  </span>
                  <span className="text-ink-soft"> · {promoDiscountLabel(code)}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {formatDate(code.starts_on)} – {formatDate(code.ends_on)}
                    {creating
                      ? " · applied when the listing is published"
                      : ` · ${code.times_used} used${left === null ? " · no limit" : ` · ${left} left`}`}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(code.id)}
                  className="inline-flex items-center gap-1 text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Deliberately NOT a <form>. This sits inside the listing form, and a
          nested one is invalid HTML: the browser drops it, every button in
          here becomes a submit button for the listing, and React raises "a
          React form was unexpectedly submitted". Controlled inputs with a
          type="button" trigger instead - which also keeps these fields out
          of the listing's own submission. */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="Code"
            id="promo_code_input"
            value={draft.code}
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            maxLength={32}
            placeholder="SUMMER10"
            className="w-40"
          />
          <SelectField
            label="Discount"
            id="promo_discount_type"
            className="w-auto"
            value={draft.discountType}
            onChange={(event) => setDraft({ ...draft, discountType: event.target.value as PromoDiscountType })}
          >
            <option value="PERCENT">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </SelectField>

          {draft.discountType === "PERCENT" ? (
            <Field
              label="% off"
              id="promo_percent_off"
              type="number"
              min="1"
              max="100"
              value={draft.percentOff}
              onChange={(event) => setDraft({ ...draft, percentOff: event.target.value })}
              className="w-24"
            />
          ) : (
            <Field
              label="S$ off"
              id="promo_amount_off"
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amountOff}
              onChange={(event) => setDraft({ ...draft, amountOff: event.target.value })}
              className="w-28"
            />
          )}
        </div>

        {/* The dates and the limit on their own row, so the amount field
            changing width between Percentage and Fixed cannot reflow them. */}
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="From"
            id="promo_starts_on"
            type="date"
            value={draft.startsOn}
            onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })}
            className="w-auto"
          />
          <Field
            label="Until"
            id="promo_ends_on"
            type="date"
            value={draft.endsOn}
            onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })}
            className="w-auto"
          />
          <Field
            label="Usage limit"
            id="promo_usage_limit"
            type="number"
            min="1"
            placeholder="No limit"
            value={draft.usageLimit}
            onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })}
            className="w-28"
          />
          <Button type="button" variant="outline" disabled={isPending} onClick={submit}>
            {isPending ? "Adding…" : "Add code"}
          </Button>
        </div>
      </div>

      <FormNotice message={error ?? undefined} />
    </FormSection>
  );
}
