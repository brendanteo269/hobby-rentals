"use client";
import { useState } from "react";
import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button, Field } from "../ui";
import { simulateWalletRequest } from "@/lib/wallet";
import { WalletDialog } from "./wallet-dialog";
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;
export function TopUpModal({ clientSecret, onClose, onSuccess }: { clientSecret: string | null; onClose: () => void; onSuccess: (amountCents: number) => void }) {
  const [amount, setAmount] = useState("50"); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); const cents = Math.round(Number(amount) * 100); if (!Number.isFinite(cents) || cents < 1000 || cents > 100000) { setError("Enter an amount between $10.00 and $1,000.00."); return; } setLoading(true); await simulateWalletRequest(null); setLoading(false); onSuccess(cents); }
  const payment = stripePromise && clientSecret ? <Elements stripe={stripePromise} options={{ clientSecret }}><div className="mt-3 rounded-sm border border-line p-3"><PaymentElement /></div></Elements> : <><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Card number" id="card-number" placeholder="4242 4242 4242 4242" autoComplete="cc-number" /><Field label="Name on card" id="card-name" autoComplete="cc-name" /></div><p className="mt-3 text-xs text-ink-soft">Test mode: use any card details. No real payment will be made.</p></>;
  return <WalletDialog title="Top up credits" onClose={onClose}><form className="mt-6 space-y-5" onSubmit={submit}><div><p className="text-sm font-medium">Choose an amount</p><div className="mt-2 flex flex-wrap gap-2">{[20,50,100,200].map((preset) => <button type="button" key={preset} onClick={() => { setAmount(String(preset)); setError(""); }} className={`rounded-sm border px-4 py-2 text-sm ${Number(amount) === preset ? "border-ink bg-sand" : "border-line bg-white"}`}>${preset}</button>)}</div></div><Field label="Custom amount" id="topup-amount" type="number" min="10" max="1000" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} />{error && <p role="alert" className="text-sm text-clay">{error}</p>}<div className="border border-line bg-white p-4"><p className="text-sm font-medium">Payment details</p>{payment}</div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Processing…" : `Add $${(Number(amount) || 0).toFixed(2)}`}</Button></div></form></WalletDialog>;
}
