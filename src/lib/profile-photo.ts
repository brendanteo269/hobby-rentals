/**
 * What a profile photo has to be, checked in the browser before anything is
 * uploaded. The backend enforces the same rules (app/avatar_service.py and
 * its settings); these exist so a member hears "too small" the moment they
 * pick the file, not after an upload round trip.
 */

import { ALLOWED_PHOTO_CONTENT_TYPES } from "@/lib/listings";

/** Mirrors the backend's profile_photo_max_bytes. Applies to the cropped file, not the original. */
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
/** The cropped photo is shrunk to at most this before upload; the backend stores exactly this. */
export const PROFILE_PHOTO_SIDE = 512;
/** Mirrors profile_photo_min_side: anything smaller would blur visibly at PROFILE_PHOTO_SIDE. */
export const PROFILE_PHOTO_MIN_SIDE = 128;

/** Why `file` cannot be a profile photo, or null when its type is fine. */
export function profilePhotoTypeError(file: File): string | null {
  return ALLOWED_PHOTO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number])
    ? null
    : "Please choose a JPEG, PNG or WebP image.";
}

/** Why an image of these dimensions cannot be a profile photo, or null. */
export function profilePhotoSizeError(width: number, height: number): string | null {
  return Math.min(width, height) < PROFILE_PHOTO_MIN_SIDE
    ? `That photo is too small. Please use one at least ${PROFILE_PHOTO_MIN_SIDE} pixels on its shorter side.`
    : null;
}

/** Why a cropped file of this many bytes cannot be uploaded, or null. */
export function profilePhotoBytesError(bytes: number): string | null {
  return bytes > PROFILE_PHOTO_MAX_BYTES
    ? `That photo is larger than ${PROFILE_PHOTO_MAX_BYTES / (1024 * 1024)} MB. Please choose a smaller one.`
    : null;
}
