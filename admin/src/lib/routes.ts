import type { Route } from "next";

/**
 * Every route in the portal, in one place.
 *
 * A path written in a redirect, a link and a middleware matcher is three
 * chances to typo and no compiler help — and the proxy in particular fails
 * open in the wrong direction if a guarded path is spelled differently there
 * than in the page that trusts it.
 */
export const ROUTES = {
  login: "/login",
  users: "/users",
  // typedRoutes checks href values against the real route tree, which a
  // template literal cannot satisfy on its own. The cast is confined to this
  // one line rather than repeated at every link.
  user: (id: string) => `/users/${id}` as Route,
} as const;

/** Paths reachable without the portal password. Everything else is guarded. */
export const PUBLIC_PATHS = [ROUTES.login];
