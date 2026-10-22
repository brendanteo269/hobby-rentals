"use client";
import { useActionState, useState } from "react";
import { buyListingPromotion } from "@/app/listings/[id]/promotion/actions";
import { Button, FormError, FormNotice } from "@/components/ui";
import { WalletPaymentSummary } from "@/components/wallet/wallet-payment-summary";
import { formatMoney } from "@/lib/format";
import type { ListingPromotionQuote } from "@/lib/listing-promotion";

/** S3-28 purchase form: cost, term and wallet balance, then an idempotent wallet purchase. */
export function ListingPromotionCard({ listingId, quote }: { listingId: string; quote: ListingPromotionQuote }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [agreed, setAgreed] = useState(false);
  const [state, action, pending] = useActionState(buyListingPromotion.bind(null, listingId), undefined);
  if (!quote.eligible) return <FormNotice message={quote.reason ?? "This listing cannot be promoted."} />;
  const shortfall = quote.wallet_shortfall_cents ?? 0;
  return (
    <section className="mt-8 card p-6">
      <h2 className="heading text-xl">Promote this listing</h2>
      <p className="body-copy mt-2">Appear above similar listings in search, with a &ldquo;Promoted&rdquo; badge.</p>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-soft">Cost</dt><dd className="mt-1 font-medium">{formatMoney(quote.fee_cents)}</dd></div>
        <div><dt className="text-ink-soft">Duration</dt><dd className="mt-1 font-medium">{quote.term_days} days</dd></div>
      </dl>
      <WalletPaymentSummary amountCents={quote.fee_cents} availableCents={quote.wallet_available_cents ?? 0} chargeLabel="fee" productName="a promotion" />
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>I understand the fee is non-refundable, even if the listing is archived.</span>
        </label>
        <FormError message={state?.error} />
        {state?.purchased && <FormNotice tone="success" message={`Your listing is promoted for the next ${quote.term_days} days.`} />}
        <Button disabled={!agreed || pending || shortfall > 0}>{pending ? "Purchasing…" : `Promote for ${formatMoney(quote.fee_cents)}`}</Button>
      </form>
    </section>
  );
}
