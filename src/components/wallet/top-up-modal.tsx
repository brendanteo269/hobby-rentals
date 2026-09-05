"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button, Field } from "../ui";
import { formatWalletAmount, simulateWalletRequest, type WalletState } from "@/lib/wallet";
import { createClient } from "@/lib/supabase/client";
import { WalletDialog } from "./wallet-dialog";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Props = { apiUrl: string; onClose: () => void; onWalletRefresh: () => Promise<WalletState> };

export function TopUpModal({ apiUrl, onClose, onWalletRefresh }: Props) {
  const [step, setStep] = useState<"amount" | "payment" | "confirmed">("amount");
  const [amount, setAmount] = useState("50");
  const [amountCents, setAmountCents] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function beginPayment(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 1000 || cents > 100000) {
      setError("Enter an amount between $10.00 and $1,000.00.");
      return;
    }
    setError("");
    setLoading(true);
    setAmountCents(cents);
    if (!stripePromise) {
      setStep("payment");
      setLoading(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const response = await fetch(`${apiUrl}/wallet/topups/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount_cents: cents }),
      });
      if (!response.ok) throw new Error("Unable to start payment.");
      const data = (await response.json()) as { client_secret?: string; payment_intent_id?: string };
      if (!data.client_secret) throw new Error("Payment setup returned no client secret.");
      if (!data.payment_intent_id) throw new Error("Payment setup returned no PaymentIntent.");
      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id);
      setStep("payment");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmed() {
    setStep("confirmed");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const wallet = await onWalletRefresh();
      const completed = wallet.transactions.some(
        (tx) => tx.type === "TOPUP" && tx.paymentIntentId === paymentIntentId && tx.status === "COMPLETED",
      );
      if (completed) onClose();
    } catch {
      setError("Payment succeeded, but your balance is still updating.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAfterWebhook() {
    setLoading(true);
    setError("");
    try {
      const wallet = await onWalletRefresh();
      const completed = wallet.transactions.some(
        (tx) => tx.type === "TOPUP" && tx.paymentIntentId === paymentIntentId && tx.status === "COMPLETED",
      );
      if (completed) onClose();
      else setError("Your payment is still being finalized. Please refresh again shortly.");
    } catch {
      setError("Unable to refresh your wallet right now.");
    } finally {
      setLoading(false);
    }
  }

  let content: React.ReactNode;
  let title: string;

  if (step === "amount") {
    title = "Top up credits";
    content = (
      <form className="mt-6 space-y-5" onSubmit={beginPayment}>
        <div>
          <p className="text-sm font-medium">Choose an amount</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[20, 50, 100, 200].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className={`rounded-sm border px-4 py-2 text-sm ${Number(amount) === preset ? "border-ink bg-sand" : "border-line bg-white"}`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Custom amount"
          id="topup-amount"
          type="number"
          min="10"
          max="1000"
          step="0.01"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-clay">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Preparing…" : "Continue to payment"}
          </Button>
        </div>
      </form>
    );
  } else if (step === "payment" && stripePromise && clientSecret) {
    title = "Enter payment details";
    content = (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <StripePaymentForm amountCents={amountCents} onConfirmed={handleConfirmed} onCancel={onClose} />
      </Elements>
    );
  } else if (step === "payment") {
    title = "Enter payment details";
    content = (
      <div className="mt-6 space-y-5">
        <div className="border border-line bg-sand p-4">
          <p className="text-sm">Test mode payment for {formatWalletAmount(amountCents)}</p>
          <p className="body-copy mt-2">No Stripe key is configured. This simulated payment does not charge a card.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Card number" id="card-number" placeholder="4242 4242 4242 4242" />
          <Field label="Name on card" id="card-name" />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setLoading(true);
              await simulateWalletRequest(null);
              await handleConfirmed();
            }}
          >
            Complete simulated payment
          </Button>
        </div>
      </div>
    );
  } else {
    title = "Payment submitted";
    content = (
      <div className="mt-6 space-y-5">
        <p role="status" className="border-l-2 border-ink bg-sand px-3 py-2 text-sm">
          Payment confirmed, updating your balance…
        </p>
        {error && (
          <p role="alert" className="text-sm text-clay">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={refreshAfterWebhook} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh balance"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WalletDialog title={title} onClose={onClose}>
      {content}
    </WalletDialog>
  );
}

function StripePaymentForm({
  amountCents,
  onConfirmed,
  onCancel,
}: {
  amountCents: number;
  onConfirmed: () => Promise<void>;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) {
      setError("Payment form is still loading.");
      return;
    }
    setLoading(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "Payment could not be completed.");
      setLoading(false);
      return;
    }
    await onConfirmed();
    setLoading(false);
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={submit}>
      <p className="body-copy">Paying {formatWalletAmount(amountCents)} securely with Stripe.</p>
      <div className="rounded-sm border border-line bg-white p-3">
        <PaymentElement />
      </div>
      {error && (
        <p role="alert" className="text-sm text-clay">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Confirming…" : "Pay securely"}
        </Button>
      </div>
    </form>
  );
}
