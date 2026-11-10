import { describe, expect, it } from "vitest";
import {
  creditEarnedCents,
  initialReferralCode,
  inviteText,
  maxCreditCents,
  normaliseReferralCode,
  welcomeRewardMessage,
  type ReferralSummary,
} from "@/lib/referrals";
import { referralPath, signupPath } from "@/lib/routes";
import { filterTransactions, mapWalletResponse, type WalletTransaction } from "@/lib/wallet";

const summary: ReferralSummary = {
  code: "K7P2QW9X",
  joined_count: 4,
  completed_count: 2,
  credited_count: 2,
  reward_cents: 500,
  max_rewarded_referrals: 10,
  referred_status: null,
};

describe("welcomeRewardMessage", () => {
  it("tells a referred member where their own reward stands", () => {
    expect(welcomeRewardMessage({ ...summary, referred_status: "JOINED" })).toBe(
      "Referral applied. You'll receive $5.00 credit after your first completed rental.",
    );
    expect(welcomeRewardMessage({ ...summary, referred_status: "REWARDED" })).toContain("$5.00 welcome credit is in your wallet");
    expect(welcomeRewardMessage({ ...summary, referred_status: "INELIGIBLE" })).toBe(
      "Your referral didn't qualify for welcome credit.",
    );
  });

  it("says nothing to a member nobody referred", () => {
    expect(welcomeRewardMessage(summary)).toBeNull();
  });
});

describe("normaliseReferralCode", () => {
  it("accepts a code however it was typed", () => {
    expect(normaliseReferralCode("  k7p2qw9x ")).toBe("K7P2QW9X");
  });

  it("refuses anything the database could not have made", () => {
    for (const value of ["", null, undefined, "K7P2QW9", "K7P2QW9XX", "K0P2QW9X", "K7P2-W9X"]) {
      expect(normaliseReferralCode(value)).toBeNull();
    }
  });
});

describe("initialReferralCode", () => {
  it("prefers the link's code, then the remembered one", () => {
    expect(initialReferralCode("K7P2QW9X", "ABCDEFGH")).toBe("K7P2QW9X");
    expect(initialReferralCode(null, "abcdefgh")).toBe("ABCDEFGH");
    expect(initialReferralCode("junk", "ABCDEFGH")).toBe("ABCDEFGH");
    expect(initialReferralCode(undefined, undefined)).toBe("");
  });
});

describe("the referral link", () => {
  it("leads to signup with the code filled in", () => {
    expect(referralPath("K7P2QW9X")).toBe("/r/K7P2QW9X");
    expect(signupPath("K7P2QW9X")).toBe("/signup?ref=K7P2QW9X");
    expect(signupPath(null)).toBe("/signup");
  });

  it("is shared with the reward in the message", () => {
    expect(inviteText(500)).toContain("we'll both get $5.00 credit after your first rental");
  });
});

describe("credit earned", () => {
  it("counts the friends credited for, out of the cap", () => {
    expect(creditEarnedCents(summary)).toBe(1000);
    expect(maxCreditCents(summary)).toBe(5000);
  });
});

describe("referral credit in the wallet", () => {
  it("is carried from the API with what can be withdrawn", () => {
    const wallet = mapWalletResponse({
      available_balance_cents: 1500,
      held_balance_cents: 0,
      credit_balance_cents: 500,
      withdrawable_cents: 1000,
      transactions: [],
    });

    expect([wallet.creditCents, wallet.withdrawableCents]).toEqual([500, 1000]);
  });

  it("is listed with the adjustments", () => {
    const row = (type: WalletTransaction["type"]): WalletTransaction => ({
      id: type, type, description: "", amountCents: 500, date: "2026-11-10", status: "COMPLETED", bookingReference: null,
    });

    const shown = filterTransactions([row("REFERRAL_CREDIT"), row("TOPUP"), row("ADMIN_CREDIT")], "adjustments");

    expect(shown.map((tx) => tx.type)).toEqual(["REFERRAL_CREDIT", "ADMIN_CREDIT"]);
  });
});
