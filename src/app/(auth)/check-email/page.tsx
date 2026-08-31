import Link from "next/link";

export const metadata = { title: "Confirm your email — HobbyRentals" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">One step left</p>
      <h1 className="display-caps mt-3 text-3xl">Check your inbox</h1>
      <p className="mt-4 body-copy">
        If {email ? <span className="text-ink">{email}</span> : "that address"} does not already
        have an account, a confirmation link is on its way. Open it to activate your account.
      </p>
      <p className="mt-4 body-copy">
        The link expires in 24 hours. If nothing arrives within a few minutes, check your spam
        folder.
      </p>
      <Link href="/login" className="mt-8 inline-block text-sm text-ink underline underline-offset-4">
        Back to log in
      </Link>
    </div>
  );
}
