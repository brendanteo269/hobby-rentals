import { describe, expect, it } from "vitest";
import {
  PROFILE_PHOTO_MAX_BYTES,
  profilePhotoBytesError,
  profilePhotoSizeError,
  profilePhotoTypeError,
} from "@/lib/profile-photo";

const file = (type: string) => new File(["x"], "photo", { type });

describe("profile photo rules", () => {
  it("accepts JPEG, PNG and WebP only", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(profilePhotoTypeError(file(type))).toBeNull();
    for (const type of ["image/gif", "image/heic", "application/pdf", ""]) expect(profilePhotoTypeError(file(type))).not.toBeNull();
  });
  it("refuses a photo under 128 pixels on its shorter side", () => {
    expect(profilePhotoSizeError(800, 127)).toMatch(/too small/);
    expect(profilePhotoSizeError(128, 128)).toBeNull();
  });
  it("refuses a cropped file over 2 MB", () => {
    expect(PROFILE_PHOTO_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(profilePhotoBytesError(PROFILE_PHOTO_MAX_BYTES)).toBeNull();
    expect(profilePhotoBytesError(PROFILE_PHOTO_MAX_BYTES + 1)).toMatch(/2 MB/);
  });
});
