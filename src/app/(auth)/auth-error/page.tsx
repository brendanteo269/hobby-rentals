import Link from "next/link";
import { FormError } from "@/components/ui";
import type { AuthErrorCode } from "@/lib/routes";

export const metadata = { title: "Confirmation failed — HobbyRentals" };

/**
 * Copy for each failure the confirmation route can report.
 *
 * An allowlist for the same reason the login notices are one: `?reason=` is
 * attacker-controlled, and echoing it back would let a crafted link put
 * arbitrary text on a HobbyRentals page. An unrecognised value shows no detail
 * at all rather than itself.
 *
 * Matched with `Object.hasOwn`, not `in`: the latter walks the prototype chain
 * and would resolve "constructor" to a function.
 */
const REASONS: Record<AuthErrorCode, string> = {
  "link-invalid": "That link has expired or has already been used.",
  "link-missing": "That link is missing its confirmation token.",
};

function reasonMessage(reason: string | undefined): string | undefined {
  if (!reason || !Object.hasOwn(REASONS, reason)) return undefined;
  return REASONS[reason as AuthErrorCode];
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="heading mt-3 text-3xl">We could not confirm that link</h1>
      <p className="mt-4 body-copy">
        Confirmation links expire after 24 hours and can only be used once. Signing up again will
        send a fresh one.
      </p>
      <div className="mt-4">
        <FormError message={reasonMessage(reason)} />
      </div>
      <Link href="/signup" className="mt-8 inline-block text-sm text-ink underline underline-offset-4">
        Back to sign up
      </Link>
    </div>
  );
}
