import Link from "next/link";

export const metadata = { title: "Confirmation failed — HobbyRentals" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="w-full max-w-md">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display-caps mt-3 text-3xl">We could not confirm that link</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Confirmation links expire after 24 hours and can only be used once. Signing up again will
        send a fresh one.
      </p>
      {reason && (
        <p className="mt-4 border-l-2 border-clay bg-sand px-3 py-2 text-sm">{reason}</p>
      )}
      <Link href="/signup" className="mt-8 inline-block text-sm text-ink underline underline-offset-4">
        Back to sign up
      </Link>
    </div>
  );
}
