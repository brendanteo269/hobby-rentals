"use server";

import { revalidatePath } from "next/cache";
import { BackendApiError } from "@/lib/api/client";
import { completeReturnInspection, startReturnInspection, submitReturnPhoto } from "@/lib/api/returns";
import type { ReturnAngle, ReturnInspection, ReturnPhotoResult } from "@/lib/returns";

export type InspectionActionResult = { error: string } | { inspection: ReturnInspection };
export type PhotoActionResult = { error: string } | { result: ReturnPhotoResult };

async function attempt<T>(action: () => Promise<T>): Promise<{ error: string } | { value: T }> {
  try {
    return { value: await action() };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

export async function startInspection(bookingId: string, clientUtcOffsetMinutes: number): Promise<InspectionActionResult> {
  const outcome = await attempt(() => startReturnInspection(bookingId, clientUtcOffsetMinutes));
  return "error" in outcome ? outcome : { inspection: outcome.value };
}

export async function submitPhoto(
  inspectionId: string,
  angle: ReturnAngle,
  photoKey: string,
  clientCapturedAt: string,
): Promise<PhotoActionResult> {
  const outcome = await attempt(() => submitReturnPhoto(inspectionId, angle, photoKey, clientCapturedAt));
  return "error" in outcome ? outcome : { result: outcome.value };
}

export async function completeInspection(bookingId: string, inspectionId: string): Promise<InspectionActionResult> {
  const outcome = await attempt(() => completeReturnInspection(inspectionId));
  if ("error" in outcome) return outcome;
  revalidatePath(`/bookings/${bookingId}/return`);
  revalidatePath("/profile");
  return { inspection: outcome.value };
}
