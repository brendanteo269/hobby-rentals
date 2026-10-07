"use client";
import { useActionState, useState } from "react";
import { buyHobbyShield } from "@/app/listings/[id]/protection/actions";
import { Button, FormError, FormNotice } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { HobbyShieldQuote } from "@/lib/owner-protection";

export function OwnerProtectionCard({ listingId, quote }: { listingId: string; quote: HobbyShieldQuote }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [agreed, setAgreed] = useState(false);
  const [state, action, pending] = useActionState(buyHobbyShield.bind(null, listingId), undefined);
  if (!quote.eligible || !quote.policy) return <FormNotice message={quote.reason ?? "HobbyShield is not available for this listing."} />;
  const policy = quote.policy;
  return <section className="mt-8 border border-line bg-white p-6"><p className="eyebrow">30-day protection</p><h2 className="heading mt-2 text-xl">HobbyShield Protection Plan</h2><p className="body-copy mt-2">Protect this item for the full declared replacement value during eligible rentals.</p><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-ink-soft">Premium today</dt><dd className="mt-1 font-medium">{formatMoney(policy.premium_cents)}</dd></div><div><dt className="text-ink-soft">Coverage cap</dt><dd className="mt-1 font-medium">{formatMoney(policy.coverage_cap_cents)}</dd></div><div><dt className="text-ink-soft">Owner excess</dt><dd className="mt-1 font-medium">{formatMoney(policy.excess_cents)}</dd></div></dl><p className="mt-5 text-xs text-ink-soft">Effective immediately for 30 days. No pro-rated refunds. Renewal is available after expiry.</p><p className="mt-2 text-xs text-ink-soft">Exclusions: {(policy.terms_snapshot.exclusions ?? []).join(", ")}.</p><form action={action} className="mt-6 space-y-4"><input type="hidden" name="idempotency_key" value={idempotencyKey} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>I understand this is a simulated platform protection plan, not insurance, and premiums are non-refundable once coverage begins.</span></label><FormError message={state?.error} />{state?.purchased && <FormNotice tone="success" message="HobbyShield is active for the next 30 days." />}<Button disabled={!agreed || pending}>{pending ? "Purchasing…" : "Purchase HobbyShield"}</Button></form></section>;
}
