"use client";

import { useActionState } from "react";
import { Button, FormMessage } from "./ui";
import { resyncHelp, type ResyncState } from "@/app/assistant/actions";

/** The help centre is re-read hourly; this is for straight after it changes. */
export function HelpResyncForm() {
  const [state, action, pending] = useActionState<ResyncState, FormData>(resyncHelp, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <Button variant="outline" disabled={pending}>
        {pending ? "Syncing…" : "Sync help content now"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
