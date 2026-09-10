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

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
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

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      body !== null && typeof body === "object" && "detail" in body
        ? body.detail
        : undefined;

    throw new BackendApiError(
      typeof detail === "string"
        ? detail
        : `Backend request failed (${res.status})`,
      res.status,
    );
  }

  if (body === null) {
    throw new BackendApiError("Invalid response from backend API", res.status);
  }

  // Types describe the backend contract; they do not validate it at runtime.
  return body as T;
}
