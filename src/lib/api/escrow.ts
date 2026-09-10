/**
 * Escrow API client for the frontend.
 */

import "server-only";

import { backendRequest } from "@/lib/api/client";

export { BackendApiError as EscrowApiError } from "@/lib/api/client";

export type EscrowStatus =
  | "PENDING_AUTHORIZATION"
  | "HELD"
  | "CAPTURED"
  | "RELEASED"
  | "CANCELLED"
  | "DISPUTED";

export type CreateHoldRequest = {
  booking_id: string;
  owner_id: string;
  /** Non-negative integer cents, validated by FastAPI. */
  rental_fee_cents: number;
  /** Non-negative integer cents, validated by FastAPI. */
  deposit_cents: number;
  /** Defaults to false on the backend when omitted. */
  include_insurance?: boolean;
};

export type CreateHoldResponse = {
  id: string;
  status: EscrowStatus;
  fee_client_secret: string;
  deposit_client_secret: string;
  insurance_client_secret: string | null;
};

/** All monetary amounts are integer cents. */
export type HoldResponse = {
  id: string;
  booking_id: string;
  renter_id: string;
  owner_id: string;
  rental_fee_cents: number;
  deposit_cents: number;
  insurance_fee_cents: number;
  status: EscrowStatus;
  platform_commission_cents: number | null;
  owner_payout_cents: number | null;
  claim_window_ends_at: string | null;
};

function holdPath(bookingId: string): string {
  return `/escrow/holds/${encodeURIComponent(bookingId)}`;
}

/** Creates payment intents; the browser must still confirm them through Stripe. */
export function createHold(data: CreateHoldRequest) {
  return backendRequest<CreateHoldResponse>("/escrow/holds", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getHold(bookingId: string) {
  return backendRequest<HoldResponse>(holdPath(bookingId));
}

export function markReturned(bookingId: string) {
  return backendRequest<HoldResponse>(`${holdPath(bookingId)}/mark-returned`, {
    method: "POST",
  });
}

export function voidHold(bookingId: string, reason: string) {
  return backendRequest<HoldResponse>(`${holdPath(bookingId)}/void`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** Local ops/testing only until the backend adds appropriate authorization. */
export function captureHold(bookingId: string) {
  return backendRequest<HoldResponse>(`${holdPath(bookingId)}/capture`, {
    method: "POST",
  });
}

/** Records payout amounts only; the backend does not transfer owner funds yet. */
// Local ops/testing only until the backend adds appropriate authorization.
export function releaseHold(bookingId: string) {
  return backendRequest<HoldResponse>(`${holdPath(bookingId)}/release`, {
    method: "POST",
  });
}

/** Current backend placeholder: owner only, and only from CAPTURED. */
export function disputeHold(bookingId: string, notes: string) {
  return backendRequest<HoldResponse>(`${holdPath(bookingId)}/dispute`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}
