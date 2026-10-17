"use server";

import { revalidatePath } from "next/cache";
import { settleOverdueFees } from "@/lib/api/overdue";
import { BackendApiError } from "@/lib/api/client";

export type SettlementResult =
  | { error: string }
  | { paidCents: number; remainingDebtCents: number };

/**
 * S3-18 Scenario 3: pays every outstanding late-fee arrear from the renter's
 * wallet, which lifts the suspension.
 *
 * Revalidates the layout as well as the page: the suspension gates booking
 * across the whole site, and the wallet balance in the header moves with it.
 */
export async function settleOverdue(): Promise<SettlementResult> {
  try {
    const result = await settleOverdueFees();
    revalidatePath("/", "layout");
    return { paidCents: result.paid_cents, remainingDebtCents: result.remaining_debt_cents };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}
