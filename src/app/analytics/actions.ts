"use server";

import { recordActivityEvent } from "@/lib/api/analytics";
import type { ActivityEvent } from "@/lib/api/analytics";

/** Best-effort bridge: telemetry must never affect a marketplace interaction. */
export async function emitActivityEvent(event: ActivityEvent): Promise<void> {
  try { await recordActivityEvent(event); } catch { /* deliberately silent */ }
}
