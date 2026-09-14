"use client";

import { useActionState, useState } from "react";
import { Button, FormMessage, Panel } from "./ui";
import {
  resendVerificationEmail,
  resetVerification,
  type VerificationState,
} from "@/app/users/actions";

type Props = {
  userId: string;
  email: string | null;
  verified: boolean;
};

const NO_EMAIL_TITLE = "This account has no email address on file.";

/**
 * The two things an administrator can do to a member's verification.
 *
 * Each form owns its own state, so a failed resend does not clear the result
 * of a reset, and the pending flag disables only the button that was pressed.
 */
export function VerificationPanel({ userId, email, verified }: Props) {
  const [resendState, resendAction, resending] = useActionState<VerificationState, FormData>(
    resendVerificationEmail,
    undefined,
  );
  const [resetState, resetAction, resetting] = useActionState<VerificationState, FormData>(
    resetVerification,
    undefined,
  );
  // Reset is consequential for a verified address (the member is locked out
  // until they confirm again), so it asks first — as a styled inline panel
  // rather than window.confirm(), which would be the one unstyled, OS-native
  // element on an otherwise fully custom page.
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <Panel
      title="Verification"
      description={
        verified
          ? "This address is confirmed. Resetting requires the member to confirm it again."
          : "This address has not been confirmed. The member cannot finish signing up until they do."
      }
    >
      <div className="space-y-6">
        {!verified && (
          <form action={resendAction} className="space-y-3">
            <input type="hidden" name="user_id" value={userId} />
            <p className="body-copy">
              Sends the exact same confirmation email again to {email ?? "this account"}, unchanged.
              Start here — it is the lighter-weight option.
            </p>
            <FormMessage state={resendState} />
            <Button
              type="submit"
              disabled={resending || !email}
              title={!email ? NO_EMAIL_TITLE : undefined}
            >
              {resending ? "Sending…" : "Resend verification email"}
            </Button>
          </form>
        )}

        <form action={resetAction} className={`space-y-3 ${verified ? "" : "border-t border-line pt-6"}`}>
          <input type="hidden" name="user_id" value={userId} />
          <p className="body-copy">
            {verified
              ? "Marks the address unverified and sends a fresh link. Use when an address must be proven again — for example, a support handover or a suspected compromise."
              : "Restarts verification from scratch and sends a fresh link. Reach for this instead of resend when the original link expired, was sent to a mistyped address, or the member wants a clean restart."}
          </p>
          <FormMessage state={resetState} />
          {confirmingReset ? (
            <div className="space-y-3 border-l-2 border-bad bg-sand px-3 py-2">
              <p className="text-sm text-ink">
                {verified
                  ? "This member will be unable to sign in until they confirm their email again. Reset verification?"
                  : "This sends a fresh link and supersedes any link already sent. Restart verification?"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={resetting || !email}
                  title={!email ? NO_EMAIL_TITLE : undefined}
                >
                  {resetting ? "Resetting…" : "Yes, reset verification"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={resetting || !email}
              title={!email ? NO_EMAIL_TITLE : undefined}
              onClick={() => setConfirmingReset(true)}
            >
              Reset verification
            </Button>
          )}
        </form>
      </div>
    </Panel>
  );
}
