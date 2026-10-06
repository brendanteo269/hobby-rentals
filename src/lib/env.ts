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
 * Reads the OneMap account credentials used to look up an address by postal
 * code. Server-only: these sign in for a bearer token, so they must never
 * reach the browser the way the Supabase values above are allowed to.
 */
export function onemapEnv() {
  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    const missing = [!email && "ONEMAP_EMAIL", !password && "ONEMAP_PASSWORD"].filter(Boolean);
    throw new Error(`Missing OneMap environment variable(s): ${missing.join(", ")}. Set them in .env.local.`);
  }

  return { email, password };
}
