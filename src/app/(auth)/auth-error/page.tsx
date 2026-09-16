import Link from "next/link";
import { FormError } from "@/components/ui";
import { FORGOT_PASSWORD_PATH, type AuthErrorCode } from "@/lib/routes";

export const metadata = { title: "Link could not be used — HobbyRentals" };

/** The ways out of this screen — a closed set, so typedRoutes can check them. */
type AdviceHref = "/signup" | "/login" | typeof FORGOT_PASSWORD_PATH;

type Advice = {
  /** What went wrong, shown as the error line. */
  message: string;
  /** What the member can do about it. */
  body: string;
  action: { href: AdviceHref; label: string };
};

/**
 * Copy for each failure the confirmation route can report.
 *
 * An allowlist for the same reason the login notices are one: `?reason=` is
 * attacker-controlled, and echoing it back would let a crafted link put
 * arbitrary text on a HobbyRentals page. Matched with `Object.hasOwn`, not
 * `in`, which walks the prototype chain and would resolve "constructor".
 *
 * The advice differs by code because the way out does: signing up again sends
 * a fresh confirmation, and does nothing at all for someone who cannot
 * remember their password (S1-17 AC4).
 */
const ADVICE: Record<AuthErrorCode, Advice> = {
  "link-invalid": {
    message: "That link has expired or has already been used.",
    body: "Confirmation links expire after 24 hours and can only be used once. Signing up again will send a fresh one.",
    action: { href: "/signup", label: "Back to sign up" },
  },
  "link-missing": {
    message: "That link is missing its confirmation token.",
    body: "It may have been cut short by your email client. Signing up again will send a fresh one.",
    action: { href: "/signup", label: "Back to sign up" },
  },
  "reset-link-invalid": {
    message: "That password reset link has expired or has already been used.",
    body: "Reset links can only be used once, and not long after they are sent. You can ask for a new one.",
    action: { href: FORGOT_PASSWORD_PATH, label: "Request a new link" },
  },
};

const FALLBACK: Advice = {
  message: "",
  body: "That link could not be used. It may have expired, or already been used.",
  action: { href: "/login", label: "Back to log in" },
};

function adviceFor(reason: string | undefined): Advice {
  if (!reason || !Object.hasOwn(ADVICE, reason)) return FALLBACK;
  return ADVICE[reason as AuthErrorCode];
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const advice = adviceFor(reason);

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="heading mt-3 text-3xl">We could not use that link</h1>
      <p className="mt-4 body-copy">{advice.body}</p>
      <div className="mt-4">
        <FormError message={advice.message || undefined} />
      </div>
      <Link
        href={advice.action.href}
        className="mt-8 inline-block text-sm text-ink underline underline-offset-4"
      >
        {advice.action.label}
      </Link>
    </div>
  );
}
