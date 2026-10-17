export type HobbyShieldPolicy = {
  id: string;
  listing_id: string;
  owner_id: string;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
  renewal_of_policy_id?: string | null;
  policy_number: string;
  purchased_at: string;
  effective_from: string;
  effective_to: string;
  premium_cents: number;
  coverage_cap_cents: number;
  excess_cents: number;
  replacement_value_cents: number;
  terms_version: string;
  terms_snapshot: { exclusions?: string[]; claim_requirements?: string; term_days?: number };
};

export type HobbyShieldQuote = {
  eligible: boolean;
  reason: string | null;
  wallet_available_cents: number | null;
  wallet_shortfall_cents: number | null;
  policy: null | {
    premium_cents: number;
    coverage_cap_cents: number;
    excess_cents: number;
    replacement_value_cents: number;
    terms_version: string;
    terms_snapshot: HobbyShieldPolicy["terms_snapshot"];
  };
};

export function policyIsCurrent(policy: HobbyShieldPolicy, now = new Date()) {
  return new Date(policy.effective_from) <= now && new Date(policy.effective_to) > now;
}

export function daysUntilExpiry(policy: HobbyShieldPolicy, now = new Date()) {
  const parts = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const localDay = (value: Date) => {
    const values = Object.fromEntries(parts(value).map(({ type, value: item }) => [type, item]));
    return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  };
  return Math.round((localDay(new Date(policy.effective_to)) - localDay(now)) / 86_400_000);
}
