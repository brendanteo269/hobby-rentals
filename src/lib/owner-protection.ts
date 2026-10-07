export type HobbyShieldPolicy = {
  id: string;
  listing_id: string;
  owner_id: string;
  status: "ACTIVE" | "EXPIRED";
  policy_number: string;
  purchased_at: string;
  effective_from: string;
  effective_to: string;
  premium_cents: number;
  coverage_cap_cents: number;
  excess_cents: number;
  replacement_value_cents: number;
  terms_version: string;
  terms_snapshot: { exclusions?: string[]; claim_requirements?: string };
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
  return policy.status === "ACTIVE" && new Date(policy.effective_to) > now;
}

export function daysUntilExpiry(policy: HobbyShieldPolicy, now = new Date()) {
  return Math.ceil((new Date(policy.effective_to).getTime() - now.getTime()) / 86_400_000);
}
