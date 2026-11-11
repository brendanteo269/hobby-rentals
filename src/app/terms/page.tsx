import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import {
  CLAIM_RESPONSE_HOURS,
  CLAIM_WINDOW_HOURS,
  DEPOSIT_CAP_BPS,
  PLATFORM_FEE_BPS,
  percent,
  type HelpSection,
} from "@/lib/help";

export const metadata: Metadata = {
  title: "Terms of use — HobbyRentals",
  description: "The rules for renting and lending gear on HobbyRentals.",
};

/*
 * Plain-language terms, written from how the platform actually behaves
 * (figures come from lib/help, which mirrors the backend). Not reviewed by a
 * lawyer: have them checked before relying on them.
 */
const SECTIONS: HelpSection[] = [
  {
    slug: "about",
    title: "What HobbyRentals is",
    body: [
      "HobbyRentals is a marketplace where people in Singapore lend and rent hobby equipment. Each rental is an agreement between the owner and the renter. We run the platform, hold the money while a rental is in progress, and handle damage claims between the two sides.",
    ],
  },
  {
    slug: "account",
    title: "Your account",
    body: [
      {
        list: [
          "Give accurate details and keep them up to date.",
          "Keep your login to yourself. You are responsible for what happens on your account.",
          "We can pause or close an account that breaks these terms, including one with an unpaid late fee.",
        ],
      },
    ],
  },
  {
    slug: "owners",
    title: "Listing an item",
    body: [
      {
        list: [
          "Only list things you own or have the right to lend, and describe their condition honestly.",
          "Before a listing goes live you record baseline photos and the item's serial number or distinguishing marks. These form its Product Passport and are used as evidence if anything goes wrong.",
          `You set the price and the deposit. The deposit can be up to ${DEPOSIT_CAP_BPS / 10_000} times the weekly rate.`,
          `We take ${percent(PLATFORM_FEE_BPS)} of the rental price as commission. Your payout is released ${CLAIM_WINDOW_HOURS} hours after the item is returned, unless a damage claim is open.`,
          "We may remove a listing that is inaccurate, unsafe or not allowed.",
        ],
      },
    ],
  },
  {
    slug: "renters",
    title: "Booking and paying",
    body: [
      `When you book you pay the rental price, a platform fee of ${percent(PLATFORM_FEE_BPS)}, the owner's deposit and, if you choose it, damage protection. Payment comes from your HobbyRentals wallet, which you top up by card through Stripe.`,
      "The money is held until the rental is settled or cancelled. Do not pay an owner, or accept payment from a renter, outside the platform: we cannot protect a payment we never held.",
    ],
  },
  {
    slug: "handover",
    title: "Handover and return",
    body: [
      {
        list: [
          "Both sides follow the guided handover in the app at pickup and return, including the return photos.",
          "Return the item by the end date, in the condition you received it apart from normal wear.",
          "A late return is charged at the daily rate for each overdue day and taken from the deposit first. If the fee passes the deposit, you cannot book again until it is paid.",
        ],
      },
    ],
  },
  {
    slug: "damage",
    title: "Damage and claims",
    body: [
      `An owner can report damage within ${CLAIM_WINDOW_HOURS} hours of the return. The renter then has ${CLAIM_RESPONSE_HOURS} hours to accept or dispute it; no reply counts as accepting. A disputed claim is decided by a HobbyRentals administrator, and that decision settles the rental.`,
      "If the agreed damage is more than the deposit, the renter still owes the difference.",
      "Damage protection and HobbyShield are schemes run by HobbyRentals. Neither is insurance.",
    ],
  },
  {
    slug: "cancellations",
    title: "Cancellations",
    body: [
      "Refunds depend on how far ahead of the start date you cancel. The cancel screen shows the exact amount before you confirm, and the deposit always comes back in full.",
    ],
  },
  {
    slug: "conduct",
    title: "What is not allowed",
    body: [
      {
        list: [
          "Listing stolen, counterfeit, illegal or unsafe items.",
          "Taking payment, or moving a booking, off the platform.",
          "Harassing other members, or using messages to send spam or scams. Messages are checked automatically for both.",
          "Leaving reviews that are false, or about a rental that did not happen.",
        ],
      },
    ],
  },
  {
    slug: "liability",
    title: "Our responsibility",
    body: [
      "We are not a party to the rental itself and do not inspect items. Owners are responsible for what they lend and renters for how they use it. As far as the law allows, we are not liable for loss or injury arising from a rental, beyond handling the money and claims as these terms describe.",
    ],
  },
  {
    slug: "changes",
    title: "Changes and governing law",
    body: [
      "We may update these terms and will change the date at the top when we do. These terms are governed by the laws of Singapore.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="11 November 2026"
      intro="The rules for renting and lending on HobbyRentals. The help centre goes into more detail on fees, deposits and claims."
      sections={SECTIONS}
    />
  );
}
