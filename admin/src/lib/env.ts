/**
 * Reads the Supabase client configuration.
 *
 * These are validated on read rather than asserted with `!` so that a missing
 * variable fails immediately with a name, instead of surfacing later as an
 * opaque "Invalid URL" from deep inside the Supabase client.
 *
 * Both values are safe to expose to the browser. The secret key, which
 * bypasses Row Level Security, must never be read here.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ].filter(Boolean);

    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.local.example to .env.local and fill them in.`,
    );
  }

  return { url, publishableKey };
}

/**
 * Where the public site lives.
 *
 * Verification links are followed by members, who belong on the member site,
 * not in this portal — a link back to :3001 would land them on a page that
 * asks them for the admin password. Defaults to the local main app.
 */
export function publicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * The single password that opens the portal.
 *
 * Falls back to a known value because this is a proof of concept and a
 * default that works out of the box is the point. That fallback is also
 * exactly why the portal must not be deployed anywhere public as it stands:
 * the default is in the repository, so an unset variable in production is an
 * open door rather than a locked one.
 *
 * Server-only. No NEXT_PUBLIC_ prefix, so it is never sent to the browser.
 */
export function portalPassword(): string {
  return process.env.ADMIN_PORTAL_PASSWORD ?? "password";
}

/**
 * Reads the Supabase secret key, which bypasses Row Level Security.
 *
 * Read lazily, at the point of use, so a missing key fails with its own name
 * rather than as a broken page — and so no code path can pick it up by
 * accident. It must never be prefixed NEXT_PUBLIC_, and must never be passed
 * to a Client Component.
 *
 * Required for everything in the portal, not just writes: with the shared
 * password there is no per-administrator session, so account lookups are made
 * with this key too.
 */
export function supabaseSecretKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. The admin portal reads account data with the " +
        "Supabase secret key; add it to admin/.env.local. It must not be exposed to the browser.",
    );
  }

  return secretKey;
}
