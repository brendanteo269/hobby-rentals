"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Undo2, Users, Wallet, type LucideIcon } from "lucide-react";
import { Button, ButtonLink, EmptyState, FormError, Modal } from "@/components/ui";
import { quoteKitAction, requestKitAction } from "@/app/bundles/build/checkout/actions";
import { kitItemsOf, quotedItemCount, type KitQuote, type KitQuoteItem } from "@/lib/booking-groups";
import { clearBundleSnapshot, loadBundleSnapshot, saveBundleSnapshot, type BundleSnapshot } from "@/lib/cross-owner-bundle-session";
import { removeItem } from "@/lib/cross-owner-bundles";
import { formatDateRange, formatMoney } from "@/lib/format";
import { renterKitPath } from "@/lib/routes";
import { Layers } from "lucide-react";

type Problem = { message: string; code?: string; shortfallCents?: number; listingId?: string };

/**
 * S5-09 checkout for a cross-owner bundle: one breakdown grouped by owner and a
 * grand total (Scenario 1), then one submit that requests every owner's items
 * at once (Scenario 2). The items come from the bundle the renter was editing,
 * which the builder kept for the session, and are priced afresh by the server:
 * what is shown here is what will be held.
 */
export function KitCheckout() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<BundleSnapshot | null | undefined>(undefined);
  const [protectedIds, setProtectedIds] = useState<ReadonlySet<string>>(new Set());
  const [quote, setQuote] = useState<KitQuote | null>(null);
  // Changes with every price this screen shows, so a retry of one submission is
  // replayed by the server and a changed one is a new request.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  // The terms of an all-or-nothing request are agreed to in a popup at the
  // moment of requesting, rather than left as small print beside the button.
  const [confirming, setConfirming] = useState(false);
  const [pricing, startPricing] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  // Restored after hydration, never in an initializer: the first client render
  // must match the server's, which has no storage.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSnapshot(loadBundleSnapshot()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const items = snapshot ? kitItemsOf(snapshot.items, protectedIds) : [];
  const itemsKey = JSON.stringify(items);

  const price = useCallback(() => {
    if (!snapshot || items.length === 0) return;
    startPricing(async () => {
      setIdempotencyKey(null);
      const result = await quoteKitAction({ start_date: snapshot.bundle.start_date, end_date: snapshot.bundle.end_date, items });
      if ("quote" in result) {
        setQuote(result.quote);
        setIdempotencyKey(crypto.randomUUID());
        setProblem(null);
      } else {
        setQuote(null);
        setProblem({ message: result.error, code: result.code, listingId: result.listingId });
      }
    });
    // `items` is rebuilt every render; its content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, itemsKey]);

  useEffect(price, [price]);

  function submit() {
    if (!snapshot || !quote || !idempotencyKey) return;
    setConfirming(false);
    startSubmitting(async () => {
      const { values } = snapshot;
      const result = await requestKitAction({
        start_date: snapshot.bundle.start_date,
        end_date: snapshot.bundle.end_date,
        items,
        idempotency_key: idempotencyKey,
        expected_total_cents: quote.total_amount_cents,
        activity: snapshot.bundle.activity,
        group_size: values.group_size ? Number(values.group_size) : undefined,
        origin_lat: values.origin_lat ? Number(values.origin_lat) : undefined,
        origin_lng: values.origin_lng ? Number(values.origin_lng) : undefined,
      });
      if ("kitId" in result) {
        clearBundleSnapshot();
        router.push(renterKitPath(result.kitId));
        return;
      }
      // The price moved: show the new total rather than leave a stale one to submit again.
      if (result.code === "QUOTE_CHANGED") price();
      setProblem({ message: result.error, code: result.code, shortfallCents: result.shortfallCents, listingId: result.listingId });
    });
  }

  /** Takes the item an owner can no longer lend out out of the bundle, so the rest can be requested. */
  function dropItem(listingId: string) {
    if (!snapshot) return;
    const item = snapshot.items.find((entry) => entry.selected?.id === listingId);
    if (!item) return;
    const next = { ...snapshot, items: removeItem(snapshot.items, item.id) };
    saveBundleSnapshot(next);
    setSnapshot(next);
    setProblem(null);
  }

  if (snapshot === undefined) return <p className="body-copy" role="status">Loading your bundle…</p>;
  if (snapshot === null || kitItemsOf(snapshot.items).length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="There is nothing to check out"
        body="Build a bundle for your activity first, then come back here to request all of it at once."
        action={<ButtonLink href="/bundles/build">Build a bundle</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <p className="body-copy">
          {snapshot.bundle.activity} · {formatDateRange(snapshot.bundle.start_date, snapshot.bundle.end_date)}
        </p>
        {quote?.owners.map((owner) => (
          <section key={owner.owner_id} className="card p-4" aria-label={`Items from ${owner.owner_name ?? "an owner"}`}>
            <h2 className="eyebrow">{owner.owner_name ?? "Owner"}</h2>
            <ul className="mt-3 divide-y divide-line">
              {owner.items.map((item) => (
                <KitItemLine
                  key={item.listing_id}
                  item={item}
                  protectedItem={protectedIds.has(item.listing_id)}
                  onToggleProtection={(on) =>
                    setProtectedIds((current) => {
                      const next = new Set(current);
                      if (on) next.add(item.listing_id);
                      else next.delete(item.listing_id);
                      return next;
                    })
                  }
                />
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <Row label="Rental" cents={owner.rental_subtotal_cents} />
              <Row label="Platform fee" cents={owner.platform_fee_cents} />
              <Row label="Deposit" cents={owner.deposit_cents} />
              {owner.protection_fee_cents > 0 && <Row label="Damage protection" cents={owner.protection_fee_cents} />}
              <Row label={`Total for ${owner.owner_name ?? "this owner"}`} cents={owner.total_amount_cents} strong />
            </dl>
          </section>
        ))}
        {!quote && pricing && <p className="body-copy" role="status">Pricing your bundle…</p>}
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-24" aria-label="Checkout total">
        <p className="eyebrow">Grand total</p>
        <p className="heading mt-1 text-3xl" aria-live="polite">
          {quote ? formatMoney(quote.total_amount_cents) : "—"}
        </p>
        {quote && (
          <p className="body-copy mt-1">
            {quotedItemCount(quote)} {quotedItemCount(quote) === 1 ? "item" : "items"} from {quote.owners.length}{" "}
            {quote.owners.length === 1 ? "owner" : "owners"}
          </p>
        )}

        <ProblemNotice problem={problem} onDrop={dropItem} />

        <Button onClick={() => setConfirming(true)} disabled={!quote || submitting || pricing || !idempotencyKey} className="mt-4 w-full">
          {submitting ? "Requesting…" : "Request all items"}
        </Button>
        <Link href="/bundles/build" className="mt-3 block text-center text-sm font-medium underline underline-offset-4">
          Back to your bundle
        </Link>
      </aside>

      {confirming && quote && (
        <Modal title="Ready to request?" onClose={() => setConfirming(false)}>
          <ul className="mt-5 space-y-4">
            <Term icon={Wallet}>{formatMoney(quote.total_amount_cents)} is held in your wallet</Term>
            <Term icon={Users}>
              {quote.owners.length === 1 ? "The owner answers" : `${quote.owners.length} owners answer`}, each for their own items
            </Term>
            <Term icon={Undo2}>If anyone says no, everything is cancelled and your money comes back</Term>
          </ul>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Go back
            </Button>
            <Button onClick={submit}>Request all items</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, cents, strong = false }: { label: string; cents: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : "text-ink-soft"}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(cents)}</dd>
    </div>
  );
}

/** One item and, where the scheme is offered, the choice to protect it. */
function KitItemLine({
  item,
  protectedItem,
  onToggleProtection,
}: {
  item: KitQuoteItem;
  protectedItem: boolean;
  onToggleProtection: (on: boolean) => void;
}) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex justify-between gap-3">
        <Link href={`/listings/${item.listing_id}`} className="font-medium hover:underline">
          {item.listing_name}
        </Link>
        <span className="text-sm font-semibold">{formatMoney(item.rental_subtotal_cents)}</span>
      </div>
      {item.protection.available && item.protection.offered_fee_cents !== null && (
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={protectedItem} onChange={(event) => onToggleProtection(event.target.checked)} />
          <ShieldCheck className="size-4 text-ink-soft" aria-hidden="true" />
          Add damage protection · {formatMoney(item.protection.offered_fee_cents)}
        </label>
      )}
    </li>
  );
}

/** Says why the bundle could not be priced or requested, with the one thing that would fix it. */
function ProblemNotice({ problem, onDrop }: { problem: Problem | null; onDrop: (listingId: string) => void }) {
  if (!problem) return null;
  return (
    <div className="mt-4">
      <FormError message={problem.message} />
      {problem.code === "INSUFFICIENT_BALANCE" && (
        <Link href="/profile?view=wallet" className="mt-2 block w-fit text-sm font-medium underline underline-offset-4">
          Top up your wallet
          {problem.shortfallCents ? ` (${formatMoney(problem.shortfallCents)} short)` : ""}
        </Link>
      )}
      {problem.code === "KIT_ITEM_UNAVAILABLE" && problem.listingId && (
        <Button variant="outline" onClick={() => onDrop(problem.listingId!)} className="mt-2 w-full">
          Remove it from the bundle
        </Button>
      )}
      {problem.code === "QUOTE_CHANGED" && <p className="mt-2 text-xs text-ink-soft">The total above is the new price.</p>}
    </div>
  );
}

/** One line of the request popup: an icon and a few words, so it is read rather than skipped. */
function Term({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="font-medium">{children}</span>
    </li>
  );
}
