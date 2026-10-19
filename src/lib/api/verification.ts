import "server-only";

import { backendRequest } from "@/lib/api/client";
import type { OwnerVerification } from "@/lib/verification";

/** Mirrors the FastAPI route in app/routers/verification.py (S4-01). */

/** The signed-in owner's own badge standing, with the record behind it. */
export function getMyOwnerVerification() {
  return backendRequest<OwnerVerification>("/verification/me");
}
