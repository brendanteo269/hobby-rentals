/**
 * S6-07: Refer a Friend. Safe for client components.
 *
 * Whether a code counts is decided by the database when the account is
 * created (record_referral_signup in the referrals migration), which ignores
 * anything that is not a live code belonging to someone else. Nothing here
 * can make a referral count; it only carries a code to the signup form.
 */

import { formatMoney } from "@/lib/format";

/** Remembers the code from a referral link until the visitor signs up. */
export const REFERRAL_COOKIE = "hr_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// The shape the database makes codes in: eight characters with no 0/O or 1/I.
// Mirrors the check on referral_codes.code.
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

/** A code as typed or carried in a link, upper-cased, or null when it could not be one. */
export function normaliseReferralCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** The code to fill the signup form with: the link's own, else the one remembered from an earlier visit. */
export function initialReferralCode(fromUrl: string | null | undefined, fromCookie: string | null | undefined): string {
  return normaliseReferralCode(fromUrl) ?? normaliseReferralCode(fromCookie) ?? "";
}

/** Mirrors ReferralSummary in app/routers/referrals.py. Counts only, never people. */
export type ReferralSummary = {
  code: string;
  joined_count: number;
  completed_count: number;
  credited_count: number;
  reward_cents: number;
  max_rewarded_referrals: number;
  /** The member's own welcome reward, when they joined through someone's link; null when nobody referred them. */
  referred_status: "JOINED" | "REWARDED" | "INELIGIBLE" | null;
};

/**
 * What the member is told about their own welcome reward, or null when
 * nobody referred them. An ineligible one is said plainly but without the
 * reason, which would say something about the person who invited them.
 */
export function welcomeRewardMessage(summary: ReferralSummary): string | null {
  const reward = formatMoney(summary.reward_cents);
  switch (summary.referred_status) {
    case "JOINED":
      return `Referral applied. You'll receive ${reward} credit after your first completed rental.`;
    case "REWARDED":
      return `Your ${reward} welcome credit is in your wallet, ready for your next rental.`;
    case "INELIGIBLE":
      return "Your referral didn't qualify for welcome credit.";
    default:
      return null;
  }
}

export function creditEarnedCents(summary: ReferralSummary): number {
  return summary.credited_count * summary.reward_cents;
}

export function maxCreditCents(summary: ReferralSummary): number {
  return summary.max_rewarded_referrals * summary.reward_cents;
}

/** The message a member's link is shared with. */
export function inviteText(rewardCents: number): string {
  return (
    `Join me on HobbyRentals and rent hobby gear from people nearby. ` +
    `Sign up with my link and we'll both get ${formatMoney(rewardCents)} credit after your first rental.`
  );
}
