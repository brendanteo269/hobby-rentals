"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, FormMessage, Input, Panel, RequiredMark, Select, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { updateSuspendBan, type SuspendBanState } from "@/app/users/[id]/suspend-ban-actions";
import type { Enforcement } from "@/lib/moderation";

/**
 * Suspending, banning or unsuspending a member (S3-24), as one choice in one
 * form. A suspension ends on the day chosen, or when an administrator lifts it;
 * a ban has no end and cannot be lifted. Each takes effect at once: the member
 * is signed out (or let back in), their listings are paused (a suspension) or
 * deactivated (a ban), and their bookings are ended or flagged. What happened,
 * when and why is in the member's activity, so it is not repeated here.
 *
 * What the dropdown offers follows where the member stands: nothing for a
 * banned member or an administrator; for a suspended member, Unsuspend or Ban
 * but not Suspend again; for anyone else, Suspend or Ban. A ban asks for
 * confirmation in a red dialog that says what it does, because it cannot be
 * undone. The result is a toast.
 */
export function UserSuspendBanPanel({
  userId,
  history,
  isAdmin,
}: {
  userId: string;
  /** Only to know where the member stands: what is in force now. */
  history: Enforcement[];
  /** An administrator cannot be suspended or banned. */
  isAdmin: boolean;
}) {
  const banned = history.some((entry) => entry.kind === "BAN" && entry.active);
  const suspended = history.some((entry) => entry.kind === "SUSPENSION" && entry.active);

  return (
    <Panel
      title="Suspend / Ban"
      description="Suspend, ban or unsuspend this member. It takes effect at once: they are signed out, and their listings and bookings are dealt with."
    >
      {isAdmin ? (
        <p className="text-sm text-ink-soft">This is an administrator&apos;s account, so it can&apos;t be suspended or banned here.</p>
      ) : banned ? (
        <p className="text-sm text-ink-soft">This member is banned. A ban is permanent and can&apos;t be lifted.</p>
      ) : (
        // Keyed on where the member stands, so the form starts afresh once an action has changed it.
        <SuspendBanForm key={suspended ? "suspended" : "free"} userId={userId} suspended={suspended} />
      )}
    </Panel>
  );
}

const SUBMIT_LABELS: Record<string, string> = { suspend: "Suspend member", ban: "Ban member", unsuspend: "Unsuspend member" };

function SuspendBanForm({ userId, suspended }: { userId: string; suspended: boolean }) {
  const [state, action, pending] = useActionState<SuspendBanState, FormData>(updateSuspendBan, undefined);
  const [choice, setChoice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Set when the dialog has been answered yes, so the next submit goes through.
  const confirmedRef = useRef(false);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  const today = new Date().toISOString().slice(0, 10);

  function ask() {
    // The dialog is asked for only once the form is complete.
    if (formRef.current?.reportValidity()) setConfirming(true);
  }

  function confirm() {
    // The dialog is done once answered; the result comes back as a toast or a message in the form.
    setConfirming(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  }

  // A submit that has not been confirmed (Enter in a field, say) asks first. One
  // that has must NOT be prevented: React runs the form's action only if the
  // submit event goes through.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    event.preventDefault();
    ask();
  }

  return (
    <>
      <form ref={formRef} action={action} className="space-y-4" onSubmit={onSubmit}>
        <input type="hidden" name="user_id" value={userId} />

        <div>
          <label htmlFor="suspend-ban-action" className="block text-sm font-medium">
            Action
            <RequiredMark />
          </label>
          <Select
            id="suspend-ban-action"
            name="operation"
            required
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            className="mt-2"
          >
            <option value="" disabled>
              Choose an action…
            </option>
            {/* Already suspended: another suspension would add nothing, so the choice is to undo it or to ban. */}
            {suspended ? (
              <option value="unsuspend">Unsuspend: let them back in, with a reason</option>
            ) : (
              <option value="suspend">Suspend until a date: it lifts by itself</option>
            )}
            <option value="ban">Ban permanently: cannot be undone</option>
          </Select>
        </div>

        {choice === "suspend" && (
          <div>
            <label htmlFor="suspend-ban-ends-on" className="block text-sm font-medium">
              Suspended until the end of
              <RequiredMark />
            </label>
            <Input id="suspend-ban-ends-on" name="ends_on" type="date" min={today} required className="mt-2 max-w-48" />
          </div>
        )}

        <div>
          <label htmlFor="suspend-ban-reason" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="suspend-ban-reason"
            name="reason"
            required
            rows={3}
            className="mt-2"
            placeholder={
              choice === "unsuspend"
                ? "Why the suspension is being lifted early. Kept in the audit trail."
                : "Why. Kept in the audit trail."
            }
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <Button type="button" onClick={ask} disabled={pending || !choice}>
          {SUBMIT_LABELS[choice] ?? "Choose an action"}
        </Button>
      </form>

      {confirming && choice === "ban" && (
        <ConfirmDialog
          tone="danger"
          title="Ban this member permanently?"
          confirmLabel="Yes, ban permanently"
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        >
          <p className="font-medium text-bad">This cannot be undone.</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>They are signed out everywhere and can never sign in again.</li>
            <li>All their listings are deactivated for good.</li>
            <li>
              Their pending and confirmed bookings are ended. An owner&apos;s renters are refunded in full; a renter is
              refunded under the cancellation policy.
            </li>
            <li>Rentals that are out are left for you to settle.</li>
            <li>They can&apos;t withdraw from their wallet, and no one can message them.</li>
          </ul>
        </ConfirmDialog>
      )}
      {confirming && choice === "suspend" && (
        <ConfirmDialog title="Suspend this member?" confirmLabel="Suspend" onConfirm={confirm} onCancel={() => setConfirming(false)}>
          <p>
            They are signed out now, their listings are paused until the suspension ends, and their pending and confirmed
            bookings that start before then are ended, with everyone refunded in full. You can unsuspend them early.
          </p>
        </ConfirmDialog>
      )}
      {confirming && choice === "unsuspend" && (
        <ConfirmDialog
          title="Unsuspend this member?"
          confirmLabel="Unsuspend"
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        >
          <p>
            This restores the member&apos;s access: they will be able to sign in again, and any listings paused by the
            suspension will be reinstated. Bookings that were cancelled during the suspension remain cancelled, and the
            affected members have already been notified.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
