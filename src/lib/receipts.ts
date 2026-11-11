/** S6-10: a receipt is for money that changed hands, so from confirmation on, and never for a cancelled booking. */
const RECEIPT_STATUSES = new Set(["CONFIRMED", "ACTIVE", "COMPLETED"]);

/** Whether a booking row offers "Receipt". A hint so the button is not shown where it cannot work; the backend decides. */
export function canDownloadReceipt(booking: { status: string }): boolean {
  return RECEIPT_STATUSES.has(booking.status);
}

/** Turns base64 file content back into bytes for a Blob. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
