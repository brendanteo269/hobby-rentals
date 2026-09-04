import { redirect } from "next/navigation";
import { hasPortalSession } from "@/lib/portal-auth";
import { ROUTES } from "@/lib/routes";

/**
 * Guards a page or server action on the portal password.
 *
 * The proxy already turns away anyone without a session, so this is the
 * second of three layers: a page that reads account data should not depend on
 * middleware having run, because a matcher change is one edit away from
 * silently exposing it. The third layer is in the database, where every
 * lookup function refuses a caller that is neither an administrator nor the
 * holder of the secret key.
 *
 * There is no user to return. A shared password says that someone is
 * authorised, not who they are — which is why actions record themselves
 * against a session rather than a person.
 */
export async function requirePortalSession(): Promise<void> {
  if (!(await hasPortalSession())) redirect(ROUTES.login);
}
