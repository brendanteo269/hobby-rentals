"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type StepResult = { error: string } | object;

/**
 * One side's confirmation of a two-party booking step (handover, return). The
 * server decides whether it is allowed and its message is shown as is. The
 * second confirmation moves the booking on, so the page is refreshed either
 * way.
 */
export function ConfirmStepButton({
  label,
  pendingLabel,
  confirm,
  className,
}: {
  label: string;
  pendingLabel: string;
  confirm: () => Promise<StepResult>;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await confirm();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <Button className={className ?? "px-3 py-1.5 text-xs"} disabled={isPending} onClick={run}>
        {isPending ? pendingLabel : label}
      </Button>
      {error && <span role="alert" className="max-w-56 text-right text-xs text-accent-dark">{error}</span>}
    </span>
  );
}
