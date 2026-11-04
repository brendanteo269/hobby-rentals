"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field } from "./ui";
import { useToast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import {
  formatSingaporeMobile,
  mobileVerificationErrorMessage,
  MOBILE_NUMBER_ERROR,
  normaliseSingaporeMobile,
  RESEND_WAIT_SECONDS,
  VERIFICATION_CODE_LENGTH,
  verificationCodeError,
} from "@/lib/mobile-number";

type Step = "verified" | "enter" | "code";

/**
 * A mobile number proven with a texted code - the only way one reaches a
 * profile. Used by onboarding and the Account tab.
 *
 * Talks to Supabase Auth from the browser, not through a server action, so
 * Auth's per-IP limits on sending and checking codes apply to each member's
 * own connection rather than to the Next server every action would share.
 * Auth sends the code (updateUser), checks it (verifyOtp), refuses a number
 * already on another account, and the sync_verified_phone trigger copies the
 * proven number into the profile. Nothing here writes the profile.
 *
 * Changing a verified number leaves the old one in place until the new one is
 * verified. Every button is type="button" and Enter is handled here, since
 * onboarding renders this inside its form and a stray submit would send it.
 */
export function MobileNumberField({
  verifiedNumber,
  unverifiedNumber = null,
  optional = false,
  onVerified,
}: {
  /** The member's verified number in E.164, if any. */
  verifiedNumber: string | null;
  /** A number typed before verification existed, offered for verifying. */
  unverifiedNumber?: string | null;
  /** Says so in the hint, where skipping it is an option (onboarding). */
  optional?: boolean;
  onVerified?: (number: string) => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [verified, setVerified] = useState(verifiedNumber);
  const [step, setStep] = useState<Step>(verifiedNumber ? "verified" : "enter");
  const [input, setInput] = useState(unverifiedNumber ?? "");
  // The number the code was sent to, so editing the box mid-way cannot
  // verify a different number from the one that was texted.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"sending" | "verifying" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Until Auth will send another code. A second or so of drift is harmless:
  // sending early just gets Auth's own "wait N seconds" message.
  const [waitSeconds, setWaitSeconds] = useState(0);
  useEffect(() => {
    if (waitSeconds === 0) return;
    const timer = setTimeout(() => setWaitSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [waitSeconds]);

  async function sendCode(number: string | null) {
    setError(null);
    if (!number) return setError(MOBILE_NUMBER_ERROR);
    // Auth treats "change to the number you already have" as nothing to do
    // and sends no text, which would leave the member waiting for a code.
    if (number === verified) return setError("That is already your verified number.");

    setBusy("sending");
    const { error: authError } = await createClient().auth.updateUser({ phone: number });
    setBusy(null);
    if (authError) return setError(mobileVerificationErrorMessage(authError));

    setSentTo(number);
    setCode("");
    setStep("code");
    setWaitSeconds(RESEND_WAIT_SECONDS);
  }

  async function verifyCode() {
    if (!sentTo) return;
    const codeError = verificationCodeError(code);
    if (codeError) return setError(codeError);

    setError(null);
    setBusy("verifying");
    const { error: authError } = await createClient().auth.verifyOtp({ phone: sentTo, token: code, type: "phone_change" });
    setBusy(null);
    if (authError) return setError(mobileVerificationErrorMessage(authError));

    setVerified(sentTo);
    setStep("verified");
    show("Mobile number verified.", "success");
    onVerified?.(sentTo);
    // The profile was updated by a database trigger, out of the server's sight.
    router.refresh();
  }

  function onEnter(action: () => void) {
    return (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      action();
    };
  }

  if (step === "verified" && verified) {
    return (
      <div>
        <p className="text-sm font-medium text-ink">Mobile number</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink">{formatSingaporeMobile(verified)}</span>
          <Badge variant="success">Verified</Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInput("");
              setError(null);
              setStep("enter");
            }}
          >
            Change number
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Shown to the other party once a booking is confirmed.</p>
      </div>
    );
  }

  if (step === "code" && sentTo) {
    return (
      <div className="space-y-3">
        <Field
          label="Verification code"
          id="mobile_verification_code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={VERIFICATION_CODE_LENGTH}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          onKeyDown={onEnter(() => void verifyCode())}
          hint={`We texted a ${VERIFICATION_CODE_LENGTH}-digit code to ${formatSingaporeMobile(sentTo)}.`}
          error={error ?? undefined}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy !== null} onClick={() => void verifyCode()}>
            {busy === "verifying" ? "Verifying…" : "Verify"}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null || waitSeconds > 0} onClick={() => void sendCode(sentTo)}>
            {busy === "sending" ? "Sending…" : waitSeconds > 0 ? `Resend in ${waitSeconds}s` : "Resend code"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setStep("enter");
            }}
          >
            Use a different number
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field
        label="Mobile number"
        id="mobile_number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="9123 4567"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onEnter(() => void sendCode(normaliseSingaporeMobile(input)))}
        // Not `required`: inside onboarding's form that would block Continue
        // natively while a verified member is part-way through changing it.
        hint={
          unverifiedNumber && !verified
            ? "Not yet verified. We'll text a code to confirm it's yours."
            : `${optional ? "Optional. " : ""}A Singapore mobile. We'll text you a code to confirm it's yours.`
        }
        error={error ?? undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || waitSeconds > 0}
          onClick={() => void sendCode(normaliseSingaporeMobile(input))}
        >
          {busy === "sending" ? "Sending…" : waitSeconds > 0 ? `Send code in ${waitSeconds}s` : "Send code"}
        </Button>
        {verified && (
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setStep("verified");
            }}
          >
            Keep {formatSingaporeMobile(verified)}
          </Button>
        )}
        {unverifiedNumber && !verified && <Badge variant="warning">Unverified</Badge>}
      </div>
    </div>
  );
}
