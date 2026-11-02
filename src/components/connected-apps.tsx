"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Field, FormError, Modal, Notice } from "./ui";
import { ConnectedAppsCapabilities } from "./connected-apps-capabilities";
import { ConnectedAppsGuide, CopyButton } from "./connected-apps-guide";
import {
  createAssistantTokenAction,
  revokeAssistantTokenAction,
  type AssistantTokenState,
} from "@/app/profile/actions";
import {
  ASSISTANT_TOKEN_NAME_MAX_LENGTH,
  isAssistantTokenExpired,
  type AssistantToken,
} from "@/lib/assistant-tokens";
import { formatDate, formatDateTime } from "@/lib/format";

/** The one time the token can be read. It lives in this form's state and is gone when the member leaves the page. */
function NewToken({ name, token }: { name: string; token: string }) {
  return (
    <Notice tone="success" className="mt-4">
      <p className="font-medium">Copy the token for {name} now. It will not be shown again.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 basis-64 break-all rounded border border-line bg-white p-2 text-xs text-ink">
          {token}
        </code>
        <CopyButton text={token} />
      </div>
      <p className="mt-3 text-sm">Next, follow step 2 of the guide below.</p>
    </Notice>
  );
}

function RevokeButton({ token }: { token: AssistantToken }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function revoke() {
    setError(undefined);
    startTransition(async () => {
      const result = await revokeAssistantTokenAction(token.id);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Revoke
      </Button>
      {open && (
        <Modal title={`Revoke ${token.name}?`} onClose={() => setOpen(false)}>
          <p className="body-copy">
            It stops working immediately, and any assistant using it can no longer see your bookings or send requests.
            Requests it already sent are not affected.
          </p>
          <FormError message={error} />
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button type="button" onClick={revoke} disabled={pending}>
              {pending ? "Revoking…" : "Revoke"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * S5-05 Scenario 1: the tokens that let an AI assistant see this member's
 * bookings and send booking requests. Owners still approve those requests, and
 * a token cannot pay, cancel, claim or message.
 */
export function ConnectedApps({ tokens }: { tokens: AssistantToken[] }) {
  const [state, formAction, pending] = useActionState<AssistantTokenState, FormData>(
    createAssistantTokenAction,
    undefined,
  );

  return (
    <section>
      <h2 className="heading text-xl">Connected apps</h2>
      <p className="body-copy mt-2 max-w-xl">
        An access token lets an AI assistant see your bookings and send booking requests for you. A request places the
        same wallet hold as one sent from this site, and the owner still has to approve it. A token cannot pay, cancel,
        make claims or send messages.
      </p>

      <form action={formAction} className="mt-6 max-w-xl">
        <Field
          label="Token name"
          id="assistant-token-name"
          name="name"
          placeholder="Claude Desktop"
          maxLength={ASSISTANT_TOKEN_NAME_MAX_LENGTH}
          required
          disabled={pending}
        />
        <FormError message={state?.error} />
        <Button type="submit" className="mt-4" disabled={pending}>
          {pending ? "Creating…" : "Create token"}
        </Button>
      </form>
      {state?.created && <NewToken name={state.created.name} token={state.created.token} />}

      <h3 className="heading mt-10 text-lg">Your tokens</h3>
      {tokens.length === 0 ? (
        <p className="body-copy mt-2">You have no access tokens.</p>
      ) : (
        <ul className="mt-4 max-w-2xl divide-y divide-line rounded-lg border border-line">
          {tokens.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="break-words text-sm font-medium">{token.name}</p>
                <p className="body-copy mt-1 text-sm">
                  Created {formatDate(token.created_at)} ·{" "}
                  {token.last_used_at ? `Last used ${formatDateTime(token.last_used_at)}` : "Never used"}
                </p>
                <p className="body-copy text-sm">
                  {isAssistantTokenExpired(token)
                    ? `Expired ${formatDate(token.expires_at)}`
                    : `Expires ${formatDate(token.expires_at)}`}
                </p>
              </div>
              <RevokeButton token={token} />
            </li>
          ))}
        </ul>
      )}

      <ConnectedAppsCapabilities />
      <ConnectedAppsGuide open={Boolean(state?.created)} />
    </section>
  );
}
