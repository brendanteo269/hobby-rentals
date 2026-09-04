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
 * refuses them. Defaults to the local main app.
 */
export function publicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Reads the Supabase secret key, which bypasses Row Level Security.
 *
 * Separate from supabaseEnv() and read lazily, at the point of use, so that
 * the whole portal does not fail to boot over a key only two actions need —
 * and so that no code path can pick it up by accident. It must never be
 * prefixed NEXT_PUBLIC_, and must never be passed to a Client Component.
 */
export function supabaseSecretKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. This action needs the Supabase secret key; " +
        "add it to admin/.env.local. It must not be exposed to the browser.",
    );
  }

  return secretKey;
}
