import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { OwnerVerification } from "@/lib/verification";
import type { RenterTrust } from "@/lib/renter-trust";

/** Mirrors the FastAPI routes in app/routers/verification.py (S4-01, S4-06). */

/** The signed-in owner's own badge standing, with the record behind it. */
export function getMyOwnerVerification() {
  return backendRequest<OwnerVerification>("/verification/me");
}

/** The signed-in renter's own Trusted Renter standing, with the record behind it. */
export function getMyRenterTrust() {
  return backendRequest<RenterTrust>("/verification/renter/me");
}
