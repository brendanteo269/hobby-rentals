import Link from "next/link";

export const metadata = { title: "Check your inbox — HobbyRentals" };

/**
 * The neutral confirmation after asking for a reset link.
 *
 * S1-17 AC2: this screen must read the same whether or not the address has an
 * account, so it deliberately does not echo the address back and its copy is
 * conditional ("if that address has an account"). That is the opposite of
 * /check-email, which after S1-01 can be direct — signup rejects an address it
 * already knows, so anyone reaching that screen really does have mail coming.
 * The two are kept apart rather than shared for exactly that reason.
 */
export default function ResetRequestedPage() {
  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Check your inbox</p>
      <h1 className="heading mt-3 text-3xl">If that address has an account</h1>
      <p className="mt-4 body-copy">
        A link to set a new password is on its way. Open it to choose a new password.
      </p>
      <p className="mt-4 body-copy">
        The link expires after a short time and can only be used once. If nothing arrives
        within a few minutes, check your spam folder.
      </p>
      <Link href="/login" className="mt-8 inline-block text-sm text-ink underline underline-offset-4">
        Back to log in
      </Link>
    </div>
  );
}
