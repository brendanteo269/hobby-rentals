import type { Route } from "next";
import { formatMoney } from "@/lib/format";

/**
 * The help centre's content: what /help shows, and what the AI assistant is
 * allowed to quote (served to it by /api/help-content).
 *
 * Each section's slug is its anchor on /help and the id the assistant cites,
 * so renaming one breaks links already shared or stored - add a new section
 * rather than renaming an old one.
 *
 * The figures below mirror the backend, which is the authority on every
 * amount actually charged: app/config.py in the API repo, and the
 * cancellation_policy_tiers rows in its v1 renter-cancellation migration.
 * Change them there first, then here.
 */

/** settings.platform_commission_bps: the renter's platform fee and the owner's commission alike. */
export const PLATFORM_FEE_BPS = 1_000;
/** settings.settlement_claim_window_hours */
export const CLAIM_WINDOW_HOURS = 24;
/** settings.damage_claim_response_hours */
export const CLAIM_RESPONSE_HOURS = 48;
/** settings.damage_claim_max_evidence_photos */
export const CLAIM_MAX_PHOTOS = 6;
/** settings.deposit_cap_bps, of the weekly-equivalent rate. */
export const DEPOSIT_CAP_BPS = 20_000;
/** settings.damage_protection_* */
export const PROTECTION_FEE_BPS = 500;
export const PROTECTION_MIN_FEE_CENTS = 300;
export const PROTECTION_COVER_CAP_CENTS = 50_000;
export const PROTECTION_EXCESS_CENTS = 2_000;
export const PROTECTION_MAX_REPLACEMENT_CENTS = 100_000;
/** settings.hobbyshield_* */
export const HOBBYSHIELD_PREMIUM_BPS = 350;
export const HOBBYSHIELD_MIN_PREMIUM_CENTS = 1_000;
export const HOBBYSHIELD_EXCESS_BPS = 1_000;
export const HOBBYSHIELD_TERM_DAYS = 30;
/** owner_protection.quote: a current term may be renewed only in its final days. */
export const HOBBYSHIELD_RENEWAL_DAYS = 7;
/** cancellation_policy_tiers, policy v1. */
export const CANCEL_FULL_HOURS = 168;
export const CANCEL_PARTIAL_HOURS = 48;
export const CANCEL_PARTIAL_REFUND_BPS = 5_000;

/** A paragraph, or a bulleted list. */
export type HelpBlock = string | { list: string[] };

export type HelpSection = { slug: string; title: string; body: HelpBlock[] };

export type HelpTopic = { id: string; title: string; summary: string; sections: HelpSection[] };

export function percent(bps: number): string {
  return `${bps / 100}%`;
}

export function helpPath(slug?: string): Route {
  return (slug ? `/help#${slug}` : "/help") as Route;
}

/** A section as plain text, for the assistant: paragraphs and list items one per line. */
export function sectionText(section: HelpSection): string {
  return section.body
    .flatMap((block) => (typeof block === "string" ? [block] : block.list.map((item) => `- ${item}`)))
    .join("\n");
}

const days = (hours: number) => hours / 24;

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "fees",
    title: "Fees and payments",
    summary: "What a rental costs, and what an owner earns from it.",
    sections: [
      {
        slug: "what-renters-pay",
        title: "What renters pay",
        body: [
          "When you book, you pay for:",
          {
            list: [
              "The rental price for your dates, at the owner's daily or weekly rate.",
              `A platform fee of ${percent(PLATFORM_FEE_BPS)} of the rental price.`,
              "The security deposit the owner has set, which comes back to you after the rental (see Security deposit).",
              "Damage protection, only if you choose it (see Damage protection).",
            ],
          },
          "You pay from your HobbyRentals wallet, which you top up by card through Stripe. The money stays on hold in your wallet until the rental is settled or cancelled.",
        ],
      },
      {
        slug: "how-prices-are-calculated",
        title: "How the rental price is worked out",
        body: [
          "A rental counts both its first and last day, so Friday to Sunday is 3 days.",
          {
            list: [
              "Daily rate only: the number of days times the daily rate.",
              "Daily and weekly rates, 7 days or more: each full week at the weekly rate, plus any extra days at the daily rate.",
              "Weekly rate only: whole weeks, so a 3-day rental costs one week.",
            ],
          },
          "The booking summary shows each line before you confirm.",
        ],
      },
      {
        slug: "what-owners-earn",
        title: "What owners earn",
        body: [
          `Owners receive the rental price less a ${percent(PLATFORM_FEE_BPS)} platform commission. The renter's platform fee and deposit are not part of the payout.`,
          `The payout reaches your wallet when the rental is settled: once the item is returned and the ${CLAIM_WINDOW_HOURS}-hour damage claim window has passed with no open claim. You can then withdraw it.`,
        ],
      },
    ],
  },
  {
    id: "deposit",
    title: "Security deposit",
    summary: "How your deposit is held, when it comes back, and what it does not cover.",
    sections: [
      {
        slug: "deposit-hold",
        title: "How the deposit is held",
        body: [
          `Each owner sets a security deposit for their listing, up to ${DEPOSIT_CAP_BPS / 10_000} times its weekly rate (or 7 times the daily rate when there is no weekly rate).`,
          "The deposit is held in your wallet with the rest of your booking. It is never paid to the owner unless a damage claim or late-return fee is taken from it.",
        ],
      },
      {
        slug: "deposit-return",
        title: "When you get your deposit back",
        body: [
          `After you return the item, the owner has ${CLAIM_WINDOW_HOURS} hours to report damage.`,
          {
            list: [
              "No claim: your whole deposit goes back to your wallet when the rental is settled.",
              "A claim: the deposit stays on hold until the claim is decided. The agreed damage is taken from it, and the rest comes back to you.",
              "Returned late: any late-return fee is taken from the deposit first (see Late returns).",
            ],
          },
          "If you cancel a booking, the whole deposit always comes back, whatever the cancellation refund.",
        ],
      },
      {
        slug: "deposit-not-a-limit",
        title: "The deposit is not a limit on what you owe",
        body: [
          "The deposit is the money held as security, not a cap on your responsibility. If you damage an item without damage protection, you can owe up to the cost of replacing it, even when that is more than the deposit.",
          "The booking summary shows both the deposit and the item's replacement value, when the owner has declared one.",
        ],
      },
    ],
  },
  {
    id: "damage-protection",
    title: "Damage protection",
    summary: "Optional cover a renter can add at booking.",
    sections: [
      {
        slug: "damage-protection-cover",
        title: "What damage protection costs and covers",
        body: [
          "You can add damage protection when you book. It limits what you pay if the item is damaged during your rental.",
          {
            list: [
              `Cost: ${percent(PROTECTION_FEE_BPS)} of the rental price, at least ${formatMoney(PROTECTION_MIN_FEE_CENTS)}.`,
              `Cover: up to ${formatMoney(PROTECTION_COVER_CAP_CENTS)}, or the item's replacement value if that is lower.`,
              `Excess: you pay the first ${formatMoney(PROTECTION_EXCESS_CENTS)} of an accepted claim yourself.`,
            ],
          },
          "The terms are fixed when you book, so a later change to the scheme never changes a rental you have already agreed.",
          "Damage protection is a scheme run by HobbyRentals and funded by protection fees. It is not insurance.",
        ],
      },
      {
        slug: "damage-protection-unavailable",
        title: "When damage protection is not offered",
        body: [
          "The booking summary says why when protection is not available. The usual reasons are:",
          {
            list: [
              "The owner has not declared the item's replacement value.",
              `The item is worth more than ${formatMoney(PROTECTION_MAX_REPLACEMENT_CENTS)}.`,
            ],
          },
          "Without protection, the deposit is held as usual and you are responsible for damage up to the replacement value.",
        ],
      },
    ],
  },
  {
    id: "hobbyshield",
    title: "HobbyShield for owners",
    summary: "A protection plan owners can buy for a listing.",
    sections: [
      {
        slug: "hobbyshield-overview",
        title: "What HobbyShield is",
        body: [
          `HobbyShield is a ${HOBBYSHIELD_TERM_DAYS}-day protection plan an owner buys for one listing. It protects the item up to its declared replacement value during eligible rentals.`,
          {
            list: [
              `Premium: ${percent(HOBBYSHIELD_PREMIUM_BPS)} of the replacement value, at least ${formatMoney(HOBBYSHIELD_MIN_PREMIUM_CENTS)}, paid from your wallet.`,
              "Coverage cap: the item's replacement value.",
              `Owner excess: ${percent(HOBBYSHIELD_EXCESS_BPS)} of the replacement value.`,
              "Not covered: normal wear and tear, pre-existing damage, and intentional damage.",
            ],
          },
          "Cover starts as soon as you buy it. The premium is not refundable once cover begins, and there are no part refunds.",
          "HobbyShield is a simulated protection plan run by HobbyRentals. It is not insurance, and it is separate from the damage protection renters can add.",
        ],
      },
      {
        slug: "hobbyshield-eligibility",
        title: "Buying and renewing HobbyShield",
        body: [
          "To buy HobbyShield for a listing:",
          {
            list: [
              "The listing must be published.",
              "You must have set its replacement value.",
              "Its Product Passport must have baseline condition photos and a completed identity (serial number) record.",
              "It must have no confirmed or active rental at the time.",
            ],
          },
          `You can renew in the last ${HOBBYSHIELD_RENEWAL_DAYS} days of a term. The new term starts exactly when the current one ends, so there is no gap or overlap. We remind you in the app before it expires.`,
        ],
      },
    ],
  },
  {
    id: "overdue",
    title: "Late returns",
    summary: "What happens if an item comes back after its end date.",
    sections: [
      {
        slug: "late-return-fees",
        title: "What happens if you return late",
        body: [
          "If an item is not back by the end date, the rental is marked overdue from the next day, and both you and the owner are told.",
          {
            list: [
              "A late fee builds up at the listing's daily rate for each overdue day, counting today. A weekly-only listing charges a seventh of its weekly rate a day.",
              "The rate is fixed on the first overdue day, so an owner changing their price cannot reprice it.",
              "When the item is back, the fee stops and is taken from your deposit first.",
            ],
          },
          "Your bookings page shows the fee so far.",
        ],
      },
      {
        slug: "account-paused",
        title: "When your account is paused",
        body: [
          "Once the late fee is more than your deposit, you cannot make new bookings until you return the item and pay what the deposit did not cover.",
          "You can pay it from your bookings page. Your account is unpaused as soon as it is paid.",
        ],
      },
      {
        slug: "rental-extensions",
        title: "Need more time? Ask for an extension",
        body: [
          "During a rental you can ask the owner for more days. If they approve, your end date moves and the extra cost is held from your wallet.",
          "The extended rental is priced as if you had booked the longer dates from the start, at your booking's original rates, so you keep any weekly rate the extra days reach.",
          "Asking before your end date avoids late fees. An extension that covers today also clears the overdue mark.",
        ],
      },
    ],
  },
  {
    id: "claims",
    title: "Damage claims",
    summary: "How owners report damage, and how renters respond.",
    sections: [
      {
        slug: "damage-claims",
        title: "How a damage claim works",
        body: [
          `An owner can report damage within ${CLAIM_WINDOW_HOURS} hours of the item being returned. The claim describes the damage, states the repair or replacement cost, and can include up to ${CLAIM_MAX_PHOTOS} photos.`,
          "The claim can draw on the return photos, the AI condition scan and the item's Product Passport as evidence.",
          "While a claim is open, the renter's deposit and the owner's payout both stay on hold.",
        ],
      },
      {
        slug: "responding-to-a-claim",
        title: "Responding to a claim",
        body: [
          `A renter has ${CLAIM_RESPONSE_HOURS} hours to accept or dispute a claim.`,
          {
            list: [
              "Accept: the claimed amount is taken from your deposit and the rest is returned to you. With damage protection, you pay only the excess and the scheme covers the rest up to its cap.",
              `No reply within ${CLAIM_RESPONSE_HOURS} hours: the claim is treated as accepted.`,
              "Dispute: give your side and evidence. An administrator reviews both sides and decides.",
            ],
          },
          "If the damage comes to more than the deposit, the settlement shows what the deposit could not cover, and you still owe it.",
        ],
      },
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations",
    summary: "What you get back if you cancel a booking.",
    sections: [
      {
        slug: "cancellation-refunds",
        title: "Cancellation refunds",
        body: [
          "How much of the rental price and platform fee comes back depends on how far ahead of the start date you cancel:",
          {
            list: [
              "Request not yet accepted by the owner: everything back.",
              `${days(CANCEL_FULL_HOURS)} or more days before the start: everything back.`,
              `${days(CANCEL_PARTIAL_HOURS)} to ${days(CANCEL_FULL_HOURS)} days before the start: ${percent(CANCEL_PARTIAL_REFUND_BPS)} back.`,
              `Less than ${CANCEL_PARTIAL_HOURS} hours before the start: nothing back.`,
            ],
          },
          "The start is counted from midnight Singapore time on the first day. The security deposit always comes back in full, and the part that is not refunded goes to the owner.",
          "Before you confirm, the cancel screen shows exactly what will come back.",
        ],
      },
      {
        slug: "when-you-cannot-cancel",
        title: "When a booking cannot be cancelled",
        body: [
          {
            list: [
              "After handover: the rental has started, so it ends through the return process instead.",
              "An item in a bundle: cancel the whole bundle booking instead.",
              "A booking that is already over.",
            ],
          },
        ],
      },
    ],
  },
];

export const HELP_SECTIONS: (HelpSection & { topic: string })[] = HELP_TOPICS.flatMap((topic) =>
  topic.sections.map((section) => ({ ...section, topic: topic.title })),
);
