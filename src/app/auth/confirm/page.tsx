import { redirect } from "next/navigation";
import { confirmEmail } from "@/app/auth/actions";
import { Button } from "@/components/ui";
import { authErrorPath } from "@/lib/routes";

export const metadata = { title: "Confirm your email — HobbyRentals" };

/**
 * Landing point for the link in a signup or email-change confirmation.
 *
 * A page rather than a route handler, and it deliberately verifies nothing on
 * its own. Opening this page costs the member's token nothing; only pressing
 * the button does, because only that issues the POST that confirmEmail
 * answers. See that action for why a GET must not be enough.
 *
 * Password resets land on /auth/recover instead, and the split is the point: a
 * `code` link carries no `type`, so nothing in the query string can say what a
 * link was for. Inferring it from `next` would decide a security question —
 * whether this session may set a password without knowing the old one — from a
 * value the URL controls. The route is the discriminator instead.
 *
 * Outside the (auth) route group because the rest of /auth is, so the centring
 * that group's layout would give is applied here by hand.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value ? value : undefined;
  };

  // A link Supabase itself rejected arrives carrying its reason and no token.
  // Only worth reading when the reason is in the query string: the
  // {{ .ConfirmationURL }} template routes through Supabase's own /auth/v1/verify,
  // which reports failures in the URL *fragment* instead — and a fragment never
  // reaches the server, so such a link lands here looking simply tokenless.
  // Sending the confirmation as {{ .TokenHash }} takes that endpoint out of the
  // chain and is what makes this branch reliable.
  if (read("error") ?? read("error_description")) redirect(authErrorPath("link-invalid"));

  const tokenHash = read("token_hash");
  const type = read("type");
  const code = read("code");

  if (!tokenHash && !code) redirect(authErrorPath("link-missing"));

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <p className="eyebrow">One step left</p>
        <h1 className="heading mt-3 text-3xl">Confirm your email</h1>
        <p className="mt-4 body-copy">
          Activate your HobbyRentals account by confirming this address. You will be sent to the
          login screen once it is done.
        </p>
        <form action={confirmEmail} className="mt-8">
          {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : null}
          {type ? <input type="hidden" name="type" value={type} /> : null}
          {code ? <input type="hidden" name="code" value={code} /> : null}
          <Button type="submit">Confirm my email</Button>
        </form>
      </div>
    </div>
  );
}
