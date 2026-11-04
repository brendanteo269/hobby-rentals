"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError } from "@/components/ui";
import { withdrawKitAction } from "@/app/rentals/kits/[id]/actions";

/** Withdraws the whole kit while no owner has accepted any of it; every hold goes back to the wallet. */
export function WithdrawKitButton({ kitId }: { kitId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function withdraw() {
    if (!window.confirm("Withdraw the whole bundle? Every hold is released and no owner is asked.")) return;
    startTransition(async () => {
      const result = await withdrawKitAction(kitId);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <Button variant="outline" onClick={withdraw} disabled={pending}>
        {pending ? "Withdrawing…" : "Withdraw bundle"}
      </Button>
      <FormError message={error} />
    </div>
  );
}
