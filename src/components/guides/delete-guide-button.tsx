"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Modal } from "@/components/ui";
import type { DeleteGuideState } from "@/app/listings/[id]/guide/actions";
import { GUIDE_DELETE_BLOCKED } from "@/lib/guides";

/**
 * Deletes the guide after a confirmation. Disabled, with the reason, while a
 * renter's booking is CONFIRMED or ACTIVE; the API refuses it then too, so a
 * booking confirmed after this page loaded is still protected.
 */
export function DeleteGuideButton({
  action,
  blocked,
}: {
  action: () => Promise<DeleteGuideState>;
  blocked: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (blocked) {
    return (
      <span title={GUIDE_DELETE_BLOCKED} className="cursor-not-allowed">
        <Button type="button" variant="outline" disabled>
          Delete guide
        </Button>
        <span className="sr-only">{GUIDE_DELETE_BLOCKED}</span>
      </span>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
        Delete guide
      </Button>
      {confirming && (
        <Modal title="Delete this guide?" onClose={() => setConfirming(false)}>
          <p className="body-copy mt-4">Renters will no longer see a quick-start guide for this listing. This can&apos;t be undone.</p>
          <div className="mt-4">
            <FormError message={state?.error} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <form action={formAction}>
              <Button type="submit" disabled={pending}>
                {pending ? "Deleting…" : "Delete guide"}
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
