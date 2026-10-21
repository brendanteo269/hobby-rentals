"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Badge, Button, FormMessage, Input, Panel, RequiredMark, Select, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import {
  suspendOrBanUser,
  liftSuspension,
  type SuspendBanState,
} from "@/app/users/[id]/suspend-ban-actions";
import { formatDateTime } from "@/lib/format";
import type { Enforcement } from "@/lib/moderation";

/**
 * Suspending or banning a member, lifting a suspension, and the history of what
 * has been done to them (S3-24). A suspension ends on the day chosen, or when an
 * administrator lifts it; a ban has no end and cannot be lifted. Each takes
 * effect at once: the member is signed out, their listings are paused (a
 * suspension) or deactivated (a ban), and their bookings are ended or flagged.
 *
 * What is offered follows where the member stands: nothing is offered for a
 * banned member or an administrator; a suspended member can be banned or have
 * the suspension lifted, but not suspended again; anyone else can be suspended
 * or banned. A ban asks for confirmation in a red dialog that says what it
 * does, because it cannot be undone. The result is a toast.
 */
export function UserSuspendBanPanel({
  userId,
  history,
  isAdmin,
}: {
  userId: string;
  history: Enforcement[];
  /** An administrator cannot be suspended or banned. */
  isAdmin: boolean;
}) {
  const banned = history.some((entry) => entry.kind === "BAN" && entry.active);
  const suspended = history.some((entry) => entry.kind === "SUSPENSION" && entry.active);

  return (
    <Panel
      title="Suspend / Ban"
      description="Suspend or ban this member. It takes effect at once: they are signed out, and their listings and bookings are dealt with."
    >
      {history.length > 0 && <History history={history} />}

      {isAdmin ? (
        <p className="text-sm text-ink-soft">This is an administrator&apos;s account, so it can&apos;t be suspended or banned here.</p>
      ) : banned ? (
        <p className="text-sm text-ink-soft">This member is banned. A ban is permanent and can&apos;t be lifted.</p>
      ) : (
        <div className="space-y-8">
          <SuspendBanForm userId={userId} suspended={suspended} />
          {suspended && <LiftForm userId={userId} />}
        </div>
      )}
    </Panel>
  );
}

function History({ history }: { history: Enforcement[] }) {
  return (
    <ol className="mb-6 space-y-3">
      {history.map((entry) => (
        <li key={entry.id} className="border-l-2 border-line pl-4 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone={entry.kind === "BAN" ? "critical" : "warning"}>{entry.kind === "BAN" ? "Ban" : "Suspension"}</Badge>
            <span className="text-xs text-ink-soft">
              {entry.source === "STRIKES" ? "Strike limit reached" : (entry.actor_label ?? "Administrator")} ·{" "}
              {formatDateTime(entry.starts_at)}
              {entry.ends_at ? ` to ${formatDateTime(entry.ends_at)}` : ", no end date"}
              {entry.lifted_at ? ` · lifted ${formatDateTime(entry.lifted_at)}` : entry.active ? " · in force" : " · ended"}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-line">{entry.reason}</p>
          {entry.lifted_reason && (
            <p className="mt-1 whitespace-pre-line text-ink-soft">
              <span className="font-medium text-ink">Lifted:</span> {entry.lifted_reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function SuspendBanForm({ userId, suspended }: { userId: string; suspended: boolean }) {
  const [state, action, pending] = useActionState<SuspendBanState, FormData>(suspendOrBanUser, undefined);
  const [choice, setChoice] = useState(suspended ? "ban" : "");
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  const today = new Date().toISOString().slice(0, 10);

  function ask() {
    // The dialog is asked for only once the form is complete.
    if (formRef.current?.reportValidity()) setConfirming(true);
  }

  return (
    <>
      <form ref={formRef} action={action} className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <input type="hidden" name="user_id" value={userId} />

        <div>
          <label htmlFor="suspend-ban-action" className="block text-sm font-medium">
            Action
            <RequiredMark />
          </label>
          <Select
            id="suspend-ban-action"
            name="action"
            required
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            className="mt-2"
          >
            <option value="" disabled>
              Choose an action…
            </option>
            {/* Already suspended: another suspension would add nothing, so only a ban is offered. */}
            {!suspended && <option value="suspend">Suspend until a date: it lifts by itself</option>}
            <option value="ban">Ban permanently: cannot be undone</option>
          </Select>
          {suspended && <p className="mt-2 text-xs text-ink-soft">This member is already suspended, so the only further step is a ban.</p>}
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
            placeholder="Why. Kept in the suspend / ban history and the audit trail."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <Button type="button" onClick={ask} disabled={pending || !choice}>
          {choice === "ban" ? "Ban member" : "Suspend member"}
        </Button>
      </form>

      {confirming && choice === "ban" && (
        <ConfirmDialog
          tone="danger"
          title="Ban this member permanently?"
          confirmLabel="Yes, ban permanently"
          onConfirm={() => {
            // The dialog is done once answered; the result comes back as a toast or a message in the form.
            setConfirming(false);
            formRef.current?.requestSubmit();
          }}
          onCancel={() => setConfirming(false)}
        >
          <p className="font-medium text-bad">This cannot be undone.</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>They are signed out everywhere and can never sign in again.</li>
            <li>All their listings are deactivated for good.</li>
            <li>Their pending and confirmed bookings are ended and the other people refunded.</li>
            <li>Rentals that are out are left for you to settle.</li>
            <li>They can&apos;t withdraw from their wallet, and no one can message them.</li>
          </ul>
        </ConfirmDialog>
      )}
      {confirming && choice === "suspend" && (
        <ConfirmDialog
          title="Suspend this member?"
          confirmLabel="Suspend"
          onConfirm={() => {
            // The dialog is done once answered; the result comes back as a toast or a message in the form.
            setConfirming(false);
            formRef.current?.requestSubmit();
          }}
          onCancel={() => setConfirming(false)}
        >
          <p>
            They are signed out now, their listings are paused until the suspension ends, and their pending and confirmed
            bookings that start before then are ended. You can lift the suspension early.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function LiftForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<SuspendBanState, FormData>(liftSuspension, undefined);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className="space-y-4 border-t border-line pt-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <input type="hidden" name="user_id" value={userId} />
        <p className="text-sm font-medium">Unsuspend</p>
        <div>
          <label htmlFor="lift-reason" className="block text-sm font-medium">
            Reason
            <RequiredMark />
          </label>
          <Textarea
            id="lift-reason"
            name="reason"
            required
            rows={2}
            className="mt-2"
            placeholder="Why the suspension is being lifted early."
          />
        </div>
        <FormMessage state={state?.error ? state : undefined} />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => formRef.current?.reportValidity() && setConfirming(true)}
        >
          Lift suspension
        </Button>
      </form>

      {confirming && (
        <ConfirmDialog
          title="Lift this suspension?"
          confirmLabel="Lift suspension"
          onConfirm={() => {
            // The dialog is done once answered; the result comes back as a toast or a message in the form.
            setConfirming(false);
            formRef.current?.requestSubmit();
          }}
          onCancel={() => setConfirming(false)}
        >
          <p>
            The member can sign in again and the listings the suspension paused go live. Bookings it ended stay ended: the
            other people were already told.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
