"use client";

import { useActionState } from "react";
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
  /** Reset is refused server-side for one's own account; hidden here to match. */
  isSelf: boolean;
};

/**
 * The two things an administrator can do to a member's verification.
 *
 * Each form owns its own state, so a failed resend does not clear the result
 * of a reset, and the pending flag disables only the button that was pressed.
 */
export function VerificationPanel({ userId, email, verified, isSelf }: Props) {
  const [resendState, resendAction, resending] = useActionState<VerificationState, FormData>(
    resendVerificationEmail,
    undefined,
  );
  const [resetState, resetAction, resetting] = useActionState<VerificationState, FormData>(
    resetVerification,
    undefined,
  );

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
              Sends the confirmation email again to {email ?? "this account"}.
            </p>
            <FormMessage state={resendState} />
            <Button type="submit" disabled={resending || !email}>
              {resending ? "Sending…" : "Resend verification email"}
            </Button>
          </form>
        )}

        {!isSelf && (
          <form
            action={resetAction}
            className={`space-y-3 ${verified ? "" : "border-t border-line pt-6"}`}
            onSubmit={(event) => {
              const message = verified
                ? "Reset verification? This member will be unable to sign in until they confirm their email again."
                : "Restart verification and send a fresh link?";
              if (!window.confirm(message)) event.preventDefault();
            }}
          >
            <input type="hidden" name="user_id" value={userId} />
            <p className="body-copy">
              {verified
                ? "Marks the address unverified and sends a fresh link. Use when an address must be proven again."
                : "Starts the verification process over and sends a fresh link."}
            </p>
            <FormMessage state={resetState} />
            <Button type="submit" variant="outline" disabled={resetting || !email}>
              {resetting ? "Resetting…" : "Reset verification"}
            </Button>
          </form>
        )}

        {isSelf && (
          <p className="body-copy border-t border-line pt-6">
            Verification cannot be reset on your own account.
          </p>
        )}
      </div>
    </Panel>
  );
}
