"use client";
import { useActionState, useState } from "react";
import { buyHobbyShield } from "@/app/listings/[id]/protection/actions";
import { Button, FormError, FormNotice } from "@/components/ui";
import { WalletPaymentSummary } from "@/components/wallet/wallet-payment-summary";
import { formatMoney } from "@/lib/format";
import { formatSingaporeDateTime } from "@/lib/format";
import type { HobbyShieldQuote } from "@/lib/owner-protection";

export function OwnerProtectionCard({ listingId, quote, renewal = false, renewalStartsAt, renewalEndsAt }: { listingId: string; quote: HobbyShieldQuote; renewal?: boolean; renewalStartsAt?: string; renewalEndsAt?: string }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [agreed, setAgreed] = useState(false);
  const [state, action, pending] = useActionState(buyHobbyShield.bind(null, listingId), undefined);
  if (!quote.eligible || !quote.policy) return <FormNotice message={quote.reason ?? "HobbyShield is not available for this listing."} />;
  const policy = quote.policy;
  const shortfall = quote.wallet_shortfall_cents ?? 0;
  const walletBalance = quote.wallet_available_cents ?? 0;
  return <section className="mt-8 card p-6"><p className="eyebrow">30-day protection</p><h2 className="heading mt-2 text-xl">HobbyShield Protection Plan</h2><p className="body-copy mt-2">Protect this item for the full declared replacement value during eligible rentals.</p><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-ink-soft">Premium today</dt><dd className="mt-1 font-medium">{formatMoney(policy.premium_cents)}</dd></div><div><dt className="text-ink-soft">Coverage cap</dt><dd className="mt-1 font-medium">{formatMoney(policy.coverage_cap_cents)}</dd></div><div><dt className="text-ink-soft">Owner excess</dt><dd className="mt-1 font-medium">{formatMoney(policy.excess_cents)}</dd></div></dl>{renewal && renewalStartsAt && renewalEndsAt && <div className="mt-5 border-l-4 border-success bg-success-soft px-4 py-4 text-sm"><p className="font-medium">Your renewed coverage period</p><p className="mt-1 text-ink-soft">{formatSingaporeDateTime(renewalStartsAt)} to {formatSingaporeDateTime(renewalEndsAt)}.</p><p className="mt-1 text-xs text-success">It begins exactly when your current policy ends, with no overlap.</p></div>}<WalletPaymentSummary amountCents={policy.premium_cents} availableCents={walletBalance} chargeLabel="premium" productName="HobbyShield" /><p className="mt-5 text-xs text-ink-soft">{renewal ? "Your new coverage starts when the current policy expires. Your coverage will not overlap." : "Effective immediately for 30 days. No pro-rated refunds."}</p><p className="mt-2 text-xs text-ink-soft">Exclusions: {(policy.terms_snapshot.exclusions ?? []).join(", ")}.</p><form action={action} className="mt-6 space-y-4"><input type="hidden" name="idempotency_key" value={idempotencyKey} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>I understand this is a simulated platform protection plan, not insurance, and premiums are non-refundable once coverage begins.</span></label><FormError message={state?.error} />{state?.purchased && <FormNotice tone="success" message={renewal ? "Your next HobbyShield term is scheduled." : "HobbyShield is active for the next 30 days."} />}<Button disabled={!agreed || pending || shortfall > 0}>{pending ? "Purchasing…" : renewal ? "Renew HobbyShield" : "Purchase HobbyShield"}</Button></form></section>;
}
