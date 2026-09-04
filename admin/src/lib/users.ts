import { createClient } from "@/lib/supabase/server";

/** Elevated platform roles, mirroring the app_role enum. */
export type AppRole = "admin";

/**
 * An account as an administrator sees it: identity and verification from
 * auth.users, everything else from profiles.
 *
 * Mirrors the row shape of admin_search_users and admin_get_user, which is
 * why both exist — one type serves the list and the detail page.
 */
export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  wants_to_rent: boolean;
  wants_to_own: boolean;
  onboarded_at: string | null;
  roles: AppRole[];
};

type SearchRow = AdminUser & { total_count: number };

export const PAGE_SIZE = 25;

export type UserSearchResult = {
  users: AdminUser[];
  total: number;
  /** Null when the search succeeded. Surfaced rather than thrown so the page can stay up. */
  error: string | null;
};

/**
 * Finds accounts by display name, email address, or account id.
 *
 * The matching happens in admin_search_users, which also re-checks that the
 * caller is an administrator. A non-admin reaching this function gets an
 * error and an empty list, never a partial one.
 */
export async function searchUsers(query: string, page = 1): Promise<UserSearchResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_search_users", {
    search: query,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    console.error("User search failed:", error.message);
    return { users: [], total: 0, error: "Could not load accounts." };
  }

  const rows = (data ?? []) as SearchRow[];

  return {
    // total_count rides along on every row; an empty page means no matches.
    total: rows[0]?.total_count ?? 0,
    // Each row carries one column more than AdminUser describes. Narrowing the
    // type is enough — copying every row to delete a number nothing reads
    // would cost more than it tidies.
    users: rows,
    error: null,
  };
}

/** One account by id, or null when no such account exists. */
export async function getUserById(id: string): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_user", { target_id: id });

  if (error) {
    console.error("User lookup failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as AdminUser[];
  return rows[0] ?? null;
}

// Derived state -----------------------------------------------------------
// Account status and roles are computed, never stored. auth.users already
// knows whether an address was confirmed and whether an account is banned;
// a second copy in our own tables would be wrong the moment either changed.

export type StatusTone = "positive" | "warning" | "critical" | "neutral";

export type AccountStatus = {
  label: string;
  tone: StatusTone;
  /** Sentence explaining what the status means for the member. */
  detail: string;
};

export function isEmailVerified(user: AdminUser): boolean {
  return user.email_confirmed_at !== null;
}

/** True while a ban is in force. A past banned_until has already expired. */
export function isSuspended(user: AdminUser): boolean {
  return user.banned_until !== null && new Date(user.banned_until) > new Date();
}

/**
 * The single status shown at the top of an account.
 *
 * Suspension outranks verification: a suspended account cannot sign in, so
 * describing it as merely "pending verification" would be misleading.
 */
export function accountStatus(user: AdminUser): AccountStatus {
  if (isSuspended(user)) {
    return {
      label: "Suspended",
      tone: "critical",
      detail: "Cannot sign in until the suspension lapses.",
    };
  }

  if (!isEmailVerified(user)) {
    return {
      label: "Pending verification",
      tone: "warning",
      detail: "The email address has not been confirmed yet.",
    };
  }

  if (!user.onboarded_at) {
    return {
      label: "Setup incomplete",
      tone: "neutral",
      detail: "Verified, but first-run setup has not been finished.",
    };
  }

  return { label: "Active", tone: "positive", detail: "Verified and able to sign in." };
}

export type RoleLabel = { label: string; tone: StatusTone };

/**
 * Every role an account holds, elevated and marketplace alike.
 *
 * Renting and owning are not rows in user_roles — they are what the member
 * opted into at signup — but an administrator looking at an account wants
 * them in the same list, so they are folded in here rather than at each
 * call site.
 */
export function roleLabels(user: AdminUser): RoleLabel[] {
  const roles: RoleLabel[] = user.roles.map((role) => ({
    label: role === "admin" ? "Administrator" : role,
    tone: "critical",
  }));

  if (user.wants_to_rent) roles.push({ label: "Renter", tone: "neutral" });
  if (user.wants_to_own) roles.push({ label: "Owner", tone: "neutral" });

  if (roles.length === 0) roles.push({ label: "No roles", tone: "neutral" });

  return roles;
}

/** Best available name for an account, for headings and audit entries. */
export function userLabel(user: Pick<AdminUser, "display_name" | "email">): string {
  return user.display_name ?? user.email ?? "Unnamed account";
}
