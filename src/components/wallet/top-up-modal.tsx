"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button, Chip, Field, Modal } from "../ui";
import { formatWalletAmount, simulateWalletRequest, walletAuthHeader, type WalletState } from "@/lib/wallet";
import { useToast } from "../toast";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Props = {
  apiUrl: string;
  onClose: () => void;
  onWalletRefresh: () => Promise<WalletState>;
  onSuccess: (message: string) => void;
};

export function TopUpModal({ apiUrl, onClose, onWalletRefresh, onSuccess }: Props) {
  const [step, setStep] = useState<"amount" | "payment" | "confirmed">("amount");
  const [amount, setAmount] = useState("50");
  const [amountCents, setAmountCents] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { show, dismiss } = useToast();

  const reportError = (message: string) => show(message, "error");

  async function beginPayment(event: React.FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 1000 || cents > 100000) {
      reportError("Enter an amount between $10.00 and $1,000.00.");
      return;
    }
    setLoading(true);
    setAmountCents(cents);
    const loadingToast = show("Preparing payment…", "loading");
    if (!stripePromise) {
      setStep("payment");
      setLoading(false);
      dismiss(loadingToast);
      return;
    }
    try {
      const headers = await walletAuthHeader();
      const response = await fetch(`${apiUrl}/wallet/topups/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
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
      reportError(caught instanceof Error ? caught.message : "Unable to start payment.");
    } finally {
      setLoading(false);
      dismiss(loadingToast);
    }
  }

  async function handleConfirmed() {
    setStep("confirmed");
    setLoading(true);
    const loadingToast = show("Updating your wallet balance…", "loading");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      const wallet = await onWalletRefresh();
      const completed = wallet.transactions.some(
        (tx) => tx.type === "TOPUP" && tx.paymentIntentId === paymentIntentId && tx.status === "COMPLETED",
      );
      if (completed) onSuccess(`Top-up of ${formatWalletAmount(amountCents)} completed.`);
    } catch {
      reportError("Payment succeeded, but your balance is still updating.");
    } finally {
      setLoading(false);
      dismiss(loadingToast);
    }
  }

  async function refreshAfterWebhook() {
    setLoading(true);
    const loadingToast = show("Refreshing your wallet…", "loading");
    try {
      const wallet = await onWalletRefresh();
      const completed = wallet.transactions.some(
        (tx) => tx.type === "TOPUP" && tx.paymentIntentId === paymentIntentId && tx.status === "COMPLETED",
      );
      if (completed) onSuccess(`Top-up of ${formatWalletAmount(amountCents)} completed.`);
      else reportError("Your payment is still being finalized. Please refresh again shortly.");
    } catch {
      reportError("Unable to refresh your wallet right now.");
    } finally {
      setLoading(false);
      dismiss(loadingToast);
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
              <Chip
                key={preset}
                selected={Number(amount) === preset}
                onClick={() => {
                  setAmount(String(preset));
                }}
              >
                ${preset}
              </Chip>
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
          onChange={(event) => setAmount(event.target.value)}
        />
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
        <div className="rounded-2xl border border-line bg-surface-muted p-4">
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
        <p role="status" className="rounded-lg border-l-2 border-ink bg-surface-muted px-3 py-2 text-sm">
          Payment confirmed, updating your balance…
        </p>
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
    <Modal title={title} onClose={onClose}>
      {content}
    </Modal>
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
  const [loading, setLoading] = useState(false);
  const { show, dismiss } = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) {
      show("Payment form is still loading.", "error");
      return;
    }
    setLoading(true);
    const loadingToast = show("Confirming payment…", "loading");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) {
      show(result.error.message ?? "Payment could not be completed.", "error");
      setLoading(false);
      dismiss(loadingToast);
      return;
    }
    dismiss(loadingToast);
    await onConfirmed();
    setLoading(false);
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={submit}>
      <p className="body-copy">Paying {formatWalletAmount(amountCents)} securely with Stripe.</p>
      <div className="rounded-lg border border-line bg-white p-3">
        <PaymentElement />
      </div>
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
