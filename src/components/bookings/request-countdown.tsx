"use client";

import { useEffect, useState } from "react";

/** "2d 4h", "5h 12m", "12m" - coarse enough to read at a glance. */
function remaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(minutes, 1)}m`;
}

/**
 * Seconds left to answer a request, ticking down; null when it has no
 * deadline. Counts from the server's figure rather than from respond_by, so a
 * browser whose clock is off still tracks the deadline the server enforces.
 */
export function useSecondsLeft(expiresInSeconds: number | null): number | null {
  const [deadline] = useState(() => (expiresInSeconds === null ? null : Date.now() + expiresInSeconds * 1000));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [deadline]);

  return deadline === null ? null : Math.floor((deadline - now) / 1000);
}

/** Time left to answer a request. */
export function RequestCountdown({ expiresInSeconds }: { expiresInSeconds: number | null }) {
  const seconds = useSecondsLeft(expiresInSeconds);
  if (seconds === null) return null;
  // The server and the browser each work this out from their own clock, so
  // the two renders can land either side of a minute boundary.
  if (seconds <= 0) return <span className="text-accent-dark" suppressHydrationWarning>Expired</span>;
  // Under six hours left is when an owner should act now rather than later.
  const urgent = seconds < 6 * 3600;
  return (
    <span className={urgent ? "font-medium text-accent-dark" : undefined} suppressHydrationWarning>
      Expires in {remaining(seconds)}
    </span>
  );
}
