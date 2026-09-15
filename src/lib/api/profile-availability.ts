import "server-only";

import { backendRequest } from "@/lib/api/client";

export type ProfileAvailability = { available_days: number[] };

export function getProfileAvailability() {
  return backendRequest<ProfileAvailability>("/profile/availability");
}

export function updateProfileAvailability(available_days: number[]) {
  return backendRequest<ProfileAvailability>("/profile/availability", { method: "PUT", body: JSON.stringify({ available_days }) });
}
