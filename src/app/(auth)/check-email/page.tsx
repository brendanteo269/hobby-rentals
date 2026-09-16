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
      <h1 className="heading mt-3 text-3xl">Check your inbox</h1>
      {/*
        Direct rather than hedged: signUp rejects an address that already has an
        account (S1-01 AC3), so by the time anyone reaches this page the link
        really has been sent.
      */}
      <p className="mt-4 body-copy">
        A confirmation link is on its way to{" "}
        {email ? <span className="text-ink">{email}</span> : "that address"}. Open it to activate
        your account — you cannot log in until you do.
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
