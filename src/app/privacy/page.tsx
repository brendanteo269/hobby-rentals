import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import type { HelpSection } from "@/lib/help";

export const metadata: Metadata = {
  title: "Privacy policy — HobbyRentals",
  description: "What HobbyRentals collects, why, and who it is shared with.",
};

/*
 * Written from what the app actually stores and the services it calls
 * (Supabase, Stripe, AWS S3, OneMap, OpenAI for opt-in translation). Update
 * it when a new third party is added. Not reviewed by a lawyer: have it
 * checked against the PDPA before relying on it.
 */
const SECTIONS: HelpSection[] = [
  {
    slug: "what-we-collect",
    title: "What we collect",
    body: [
      {
        list: [
          "Account details: your name, email address, mobile number and profile photo.",
          "Pickup address and area, so renters can see roughly where an item is.",
          "Listings, including photos, serial numbers and condition records.",
          "Bookings, wallet transactions, reviews, damage claims and the photos attached to them.",
          "Messages you send to other members.",
        ],
      },
      "Card details go straight to Stripe. We never see or store your full card number.",
    ],
  },
  {
    slug: "how-we-use-it",
    title: "How we use it",
    body: [
      {
        list: [
          "To run bookings, hold and release payments, and settle claims.",
          "To show your listings, reviews and approximate location to other members.",
          "To send booking updates and reminders by email and in the app.",
          "To check messages automatically for scams and attempts to move payment off the platform.",
        ],
      },
    ],
  },
  {
    slug: "who-sees-it",
    title: "Who sees it",
    body: [
      "Other members see your display name, photo, reviews and listings. The person you are renting to or from also sees what they need for the handover.",
      "We use these services to run HobbyRentals, and they process data only for that purpose:",
      {
        list: [
          "Supabase, for accounts and the database.",
          "Amazon Web Services, for storing photos.",
          "Stripe, for card payments.",
          "OneMap, to look up addresses from postal codes.",
          "OpenAI, only when you ask for a message to be translated.",
        ],
      },
      "We do not sell your data.",
    ],
  },
  {
    slug: "how-long",
    title: "How long we keep it",
    body: [
      "We keep your account data while your account is open. Booking, payment and claim records are kept after that where we need them to settle disputes or meet legal obligations.",
    ],
  },
  {
    slug: "your-choices",
    title: "Your choices",
    body: [
      "You can edit your profile and notification settings at any time. To get a copy of your data, correct something you cannot edit yourself, or close your account, contact support.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="11 November 2026"
      intro="What we collect when you use HobbyRentals, what we do with it, and who else handles it."
      sections={SECTIONS}
    />
  );
}
