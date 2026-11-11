"use client";

import { useActionState } from "react";
import { Button, FormMessage } from "./ui";
import { runPromotion, type FormState } from "@/app/assistant/actions";

/** Runs the nightly check for well-rated answers now. */
export function PromoteAnswersForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(runPromotion, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <Button variant="outline" disabled={pending}>{pending ? "Checking…" : "Check for good answers now"}</Button>
      <FormMessage state={state} />
    </form>
  );
}
