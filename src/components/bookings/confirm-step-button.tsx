"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";

type StepResult = { error: string } | object;

/**
 * One side's confirmation of a two-party booking step (handover, return). The
 * server decides whether it is allowed and a refusal is shown as is, in a
 * dialog in the middle of the screen. The second confirmation moves the
 * booking on, so the page is refreshed either way.
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
      router.refresh();
    });
  }

  return (
    <>
      <Button className={className ?? "px-3 py-1.5 text-xs"} disabled={isPending} onClick={run}>
        {isPending ? pendingLabel : label}
      </Button>
      {error && (
        <Modal title="Can't confirm yet" onClose={() => setError(null)}>
          <p role="alert" className="body-copy mt-4">{error}</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setError(null)}>OK</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
