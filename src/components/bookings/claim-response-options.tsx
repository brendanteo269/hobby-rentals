"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormNotice, Modal, Notice } from "@/components/ui";
import { acceptClaim } from "@/app/bookings/[id]/claim/actions";
import { RebuttalForm } from "@/components/bookings/rebuttal-form";
import { formatMoney } from "@/lib/format";
import type { ClaimSettlement } from "@/lib/settlement";

/**
 * S3-06 Scenario 3: the renter's two answers to a claim, offered within the
 * response window.
 *
 * Accepting settles from the deposit (S3-07); disputing opens a rebuttal
 * form and hands the case to an arbitrator (S3-08).
 *
 * Accepting is confirmed in a dialog rather than on one click, because it
 * settles the rental on the spot - the deposit is deducted, the owner is paid
 * and the claim closes, none of which the renter can undo afterwards. The
 * dialog states the amount so the figure they are agreeing to is the last
 * thing they read.
 */
export function ClaimResponseOptions({
  bookingId,
  claimedCents,
  depositCents,
}: {
  bookingId: string;
  claimedCents: number;
  depositCents?: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [done, setDone] = useState<ClaimSettlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, startAccepting] = useTransition();

  // Scenario 3: the deduction can never exceed the deposit actually held, so
  // that - not the claimed figure - is what the renter is agreeing to part
  // with. The difference is recorded as unrecovered and nothing collects it;
  // saying "still owed" would promise a debt this platform never pursues.
  const unrecovered = depositCents == null ? 0 : Math.max(claimedCents - depositCents, 0);
  const deducted = claimedCents - unrecovered;

  function confirm() {
    setError(null);
    startAccepting(async () => {
      const result = await acceptClaim(bookingId);
      if ("error" in result) setError(result.error);
      else setDone(result.settlement);
    });
  }

  function close() {
    setOpen(false);
    if (done) router.refresh();
  }

  return (
    <section aria-labelledby="claim-response-heading" className="space-y-3 rounded-xl border border-line px-4 py-4">
      <h2 id="claim-response-heading" className="heading text-xl">
        {disputing ? "Renter dispute form submission" : "Your response"}
      </h2>
      {/* The two-way choice is only a choice until one is taken; once the
          renter is filling the rebuttal in, describing the other option
          competes with the form they are reading. */}
      {!disputing && (
        <p className="body-copy">
          Accept the claim to have it settled from your deposit, or dispute it to have the platform decide.
        </p>
      )}
      {disputing ? (
        <RebuttalForm bookingId={bookingId} onCancel={() => setDisputing(false)} />
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { setOpen(true); setDone(null); setError(null); }}>Accept claim</Button>
          <Button variant="outline" onClick={() => setDisputing(true)}>
            Dispute claim
          </Button>
        </div>
      )}

      {open && (
        <Modal title={done ? "Claim settled" : "Accept this claim?"} onClose={close}>
          <div className="mt-4 space-y-4 text-sm">
            {done ? (
              <Settled settlement={done} onClose={close} />
            ) : (
              <>
                <p className="text-ink">
                  {formatMoney(deducted)} will be taken from your security deposit and paid to the
                  owner.{" "}
                  {unrecovered > 0
                    ? "That is your whole deposit."
                    : "Anything left over comes back to you straight away."}
                </p>
                {unrecovered > 0 && (
                  <Notice>
                    The {formatMoney(claimedCents)} claim by owner is {formatMoney(unrecovered)} more than the security deposit. That difference is
                    not taken from you and you will not be billed for it. It is recorded against
                    the rental as unrecovered.
                  </Notice>
                )}
                <p className="text-xs text-ink-soft">
                  This settles the rental and cannot be undone. Dispute it instead if you disagree.
                </p>
                <FormNotice message={error ?? undefined} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={accepting} onClick={close}>
                    Go back
                  </Button>
                  <Button disabled={accepting} onClick={confirm}>
                    {accepting ? "Settling…" : "Yes, accept"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

function Settled({ settlement, onClose }: { settlement: ClaimSettlement; onClose: () => void }) {
  return (
    <>
      <dl className="divide-y divide-line border-y border-line">
        <Row label="Paid to the owner">{formatMoney(settlement.deducted_cents)}</Row>
        <Row label="Back to your wallet">{formatMoney(settlement.deposit_refund_cents)}</Row>
        {settlement.unrecovered_cents > 0 && (
          <Row label="Not covered by your deposit">{formatMoney(settlement.unrecovered_cents)}</Row>
        )}
      </dl>
      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-ink-soft">
      <dt>{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
