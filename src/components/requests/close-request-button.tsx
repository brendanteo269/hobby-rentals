"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormNotice } from "@/components/ui";
import { closeRequest } from "@/app/requests/actions";

/**
 * S5-13 Scenario 4: the renter taking their own request down.
 *
 * Says what closing does before it is pressed, because it is not undoable
 * from here - a renter who still wants the gear would have to post again.
 */
export function CloseRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await closeRequest(requestId);
            if ("error" in result) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Closing…" : "Close this request"}
      </Button>
      <p className="mt-2 text-sm text-ink-soft">
        It comes off the board and owners can no longer offer on it.
      </p>
      <FormNotice message={error ?? undefined} />
    </div>
  );
}
