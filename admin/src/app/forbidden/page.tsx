import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui";

export const metadata = { title: "Not available — HobbyRentals Admin" };

/**
 * Shown to a signed-in member without the admin role.
 *
 * Deliberately barren: no account data, no counts, and no confirmation that
 * User Management exists as a page they merely failed to reach. The only
 * control is a way back out, so somebody who signed in with the wrong account
 * is not stuck.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow">HobbyRentals</p>
        <h1 className="display-caps mt-3 text-3xl">Not available</h1>
        <p className="body-copy mt-3">
          This account does not have access to admin tools. If you believe that is wrong, ask
          an administrator to grant it.
        </p>
        <form action={signOut} className="mt-8">
          <Button type="submit" variant="outline">
            Sign in as someone else
          </Button>
        </form>
      </div>
    </div>
  );
}
