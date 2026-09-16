/**
 * HTTP client for communicating with the FastAPI backend.
 *
 * Provides a single `backendRequest` function used by all server-side API
 * modules (Server Components, Server Actions, Route Handlers). It handles:
 * - Authentication: retrieves the current Supabase session and attaches the
 *   JWT access token as a Bearer header on every request.
 * - Redirection: automatically redirects unauthenticated users to /login.
 * - Error handling: parses FastAPI error responses and throws a
 *   `BackendApiError` with the HTTP status code and detail message.
 *
 * All escrow, user, and other backend API modules should import and use
 * `backendRequest` rather than calling `fetch` directly.
 *
 * This file is server-only and cannot be imported by client components.
 */

import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Field path ("max_rental_days") to the message FastAPI returned for it. */
export type FieldErrors = Record<string, string>;

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /**
     * Populated only for 422s, where FastAPI returns one entry per invalid
     * field. Forms render these beside the field they name; anything that
     * only needs a summary can keep using `message`.
     */
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

type ValidationEntry = { loc: unknown[]; msg: string };

function isValidationEntry(entry: unknown): entry is ValidationEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    Array.isArray((entry as ValidationEntry).loc) &&
    typeof (entry as ValidationEntry).msg === "string"
  );
}

/**
 * Turns FastAPI's 422 `detail` array into a field-keyed map.
 *
 * `loc` arrives as ["body", "max_rental_days"] or, for a nested rule,
 * ["body", "blackout_dates", 0, "WEEKLY", "weekdays"]. The leading "body" or
 * "query" is dropped so the key matches the form control's name. Pydantic
 * prefixes messages from custom validators with "Value error, "; those
 * messages are written for the member reading the form, so the prefix is
 * stripped rather than shown.
 */
function parseFieldErrors(detail: unknown): FieldErrors {
  if (!Array.isArray(detail)) return {};

  const errors: FieldErrors = {};
  for (const entry of detail) {
    if (!isValidationEntry(entry)) continue;

    const path = entry.loc
      .filter((part, index) => !(index === 0 && (part === "body" || part === "query")))
      .join(".");
    if (!path) continue;

    // First message wins: a field with several failures reads better with one
    // line under it than with every rule it broke.
    errors[path] ??= entry.msg.replace(/^Value error, /, "");
  }
  return errors;
}

/** Shared FastAPI client for Server Components, Server Actions and Route Handlers. */
export async function backendRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  // getUser verifies the identity; getSession supplies the token to forward.
  // FastAPI independently verifies this token and authorizes the operation.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) redirect("/login");

  const apiBase = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    // Never forward the user's token to a redirect destination.
    redirect: "error",
  });

  // The backend verifies this token independently, so it is the first to
  // notice one that expired mid-page. Treating that as a dead session here
  // means an authenticated *action* lands on the login screen with an
  // explanation, rather than surfacing a raw 401 to the member.
  if (res.status === 401) redirect("/login?reason=expired");

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      body !== null && typeof body === "object" && "detail" in body
        ? body.detail
        : undefined;

    const fieldErrors = parseFieldErrors(detail);
    // A 422 carries its specifics per field, so the summary stays generic and
    // the form puts each message where the member is looking.
    const message =
      typeof detail === "string"
        ? detail
        : Object.keys(fieldErrors).length > 0
          ? "Please correct the highlighted fields."
          : `Backend request failed (${res.status})`;

    throw new BackendApiError(message, res.status, fieldErrors);
  }

  if (body === null) {
    throw new BackendApiError("Invalid response from backend API", res.status);
  }

  // Types describe the backend contract; they do not validate it at runtime.
  return body as T;
}
