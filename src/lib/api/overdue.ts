import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { SuspensionStatus } from "@/lib/overdue";

/** Mirrors the FastAPI routes in app/routers/overdue.py (S3-18). */

/** What this renter owes in late fees, and the rentals it came from. */
export function getMySuspension() {
  return backendRequest<SuspensionStatus>("/overdue/me");
}

/** Settles every outstanding arrear from the wallet, lifting the suspension. */
export function settleOverdueFees() {
  return backendRequest<{ paid_cents: number; remaining_debt_cents: number }>("/overdue/settle", {
    method: "POST",
  });
}
