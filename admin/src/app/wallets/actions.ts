"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

export type WalletAdjustmentState = { error?: string; success?: string } | undefined;

/**
 * Turns a dollar amount typed into the form into integer cents.
 *
 * Rejects here, before the database is asked to, so an obviously malformed
 * amount ("abc", "-5", "1.999") gets a fast, specific answer rather than
 * whatever generic message the RPC's own `amount_cents > 0` check would give
 * for a value that never should have parsed as a valid amount in the first
 * place. Not authoritative: admin_apply_wallet_adjustment revalidates the
 * amount itself, because a stale balance check can only be caught there.
 */
function parseDollarsToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  return cents > 0 ? cents : null;
}

/**
 * Applies a manual credit or debit to a wallet.
 *
 * The database function does the real work atomically — locks the wallet,
 * validates the amount against the current balance, inserts the new ledger
 * row, updates the balance, and writes the audit entry. This action only
 * parses the form and passes the failure through; it never touches
 * admin_audit_log directly, so an adjustment is recorded exactly once.
 */
export async function applyWalletAdjustment(
  _prev: WalletAdjustmentState,
  formData: FormData,
): Promise<WalletAdjustmentState> {
  await requirePortalSession();

  const walletId = String(formData.get("wallet_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");

  if (direction !== "CREDIT" && direction !== "DEBIT") {
    return { error: "Choose whether this is a credit or a debit." };
  }

  if (!reason) {
    return { error: "A justification is required." };
  }

  const amountCents = parseDollarsToCents(amountRaw);
  if (amountCents === null) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const { error } = await createAdminClient().rpc("admin_apply_wallet_adjustment", {
    target_wallet_id: walletId,
    direction,
    amount_cents: amountCents,
    reason,
  });

  // admin_apply_wallet_adjustment raises a plain-English message for every
  // rejection (invalid amount, insufficient balance, missing wallet) — shown
  // as-is, the same way resetVerification passes a Supabase error through.
  if (error) return { error: error.message };

  revalidatePath(ROUTES.wallet(walletId));

  return {
    success: `${direction === "CREDIT" ? "Credited" : "Debited"} ${formatMoney(amountCents)}.`,
  };
}
