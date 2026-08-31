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
