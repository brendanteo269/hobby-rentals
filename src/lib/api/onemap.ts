import { onemapEnv } from "@/lib/env";

/**
 * OneMap (onemap.gov.sg) address lookup by postal code - used to autofill a
 * meetup's custom address so a renter/owner doesn't have to type a full
 * street address by hand. Server-only: it signs in with a real account and
 * must never expose that token (or the credentials behind it) to the browser,
 * which is why this is called through /api/onemap/search rather than
 * directly from the modal.
 */

const AUTH_URL = "https://www.onemap.gov.sg/api/auth/post/getToken";
const SEARCH_URL = "https://www.onemap.gov.sg/api/common/elastic/search";

/** Refreshed this long before it actually expires, so a request never races an expiry mid-flight. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
/** OneMap's own response doesn't always carry a usable expiry; falls back to this rather than refreshing every call. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

type OnemapAuthResponse = { access_token: string; expiry_timestamp: string };

async function fetchToken(): Promise<{ value: string; expiresAt: number }> {
  const { email, password } = onemapEnv();

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`OneMap sign-in failed (${response.status}).`);
  }

  const body = (await response.json()) as Partial<OnemapAuthResponse>;
  if (!body.access_token) {
    throw new Error("OneMap sign-in did not return an access token.");
  }

  // expiry_timestamp is Unix seconds; fall back to a conservative default
  // TTL rather than failing outright if OneMap ever changes this field.
  const expirySeconds = Number(body.expiry_timestamp);
  const expiresAt = Number.isFinite(expirySeconds) ? expirySeconds * 1000 : Date.now() + DEFAULT_TTL_MS;

  return { value: body.access_token, expiresAt };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - REFRESH_BUFFER_MS) {
    return cachedToken.value;
  }
  cachedToken = await fetchToken();
  return cachedToken.value;
}

export type OnemapAddress = {
  address: string;
  postal: string;
  latitude: number;
  longitude: number;
};

type OnemapSearchResult = {
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
};

/**
 * Looks up addresses for a Singapore postal code. Returns an empty array for
 * "nothing found" rather than throwing - a postal code that doesn't resolve
 * yet (still being typed, or simply wrong) is an everyday case for the modal
 * to show "no match" for, not an error.
 */
export async function searchByPostalCode(postal: string): Promise<OnemapAddress[]> {
  const token = await getToken();

  const url = new URL(SEARCH_URL);
  url.searchParams.set("searchVal", postal);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`OneMap search failed (${response.status}).`);
  }

  const body = (await response.json()) as { results?: OnemapSearchResult[] };
  return (body.results ?? [])
    .filter((result) => result.ADDRESS && result.POSTAL && result.LATITUDE && result.LONGITUDE)
    .map((result) => ({
      address: result.ADDRESS!,
      postal: result.POSTAL!,
      latitude: Number(result.LATITUDE),
      longitude: Number(result.LONGITUDE),
    }));
}
