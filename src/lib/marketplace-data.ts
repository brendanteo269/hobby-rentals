/**
 * Placeholder marketplace content for the landing page.
 *
 * These arrays stand in for queries against Supabase. Keeping them in one
 * module means swapping the source later touches this file and nothing that
 * renders it.
 */

export type Category = { name: string; listings: string };
export type Step = { n: string; title: string; body: string };
export type Listing = {
  title: string;
  price: string;
  body: string;
  /** Neighbourhood and the owner's typical reply time. */
  meta: string;
  tag: string;
  /** Description of the photograph this card still needs. */
  slot: string;
};

export const CATEGORIES: Category[] = [
  { name: "Cameras & drones", listings: "431 listings" },
  { name: "Camping & hiking", listings: "687 listings" },
  { name: "Water sports", listings: "312 listings" },
  { name: "Music & audio", listings: "526 listings" },
];

export const STEPS: Step[] = [
  {
    n: "01",
    title: "Find it nearby",
    body: "Filter by hobby, dates and MRT stop. Every listing shows the owner's real response time.",
  },
  {
    n: "02",
    title: "Book the dates",
    body: "Request the days you need and pay in the app. Nothing leaves your account until the owner accepts.",
  },
  {
    n: "03",
    title: "Collect and go",
    body: "Meet the owner, check the kit together in the app, and the rental is covered from that moment.",
  },
];

export const LISTINGS: Listing[] = [
  {
    title: "DJI Osmo Pocket 4 Creator Combo",
    price: "$49.00 / 2 days",
    body: "Wide lens, two batteries and the wireless mic in the case.",
    meta: "Bukit Timah · replies in 2h",
    tag: "Cameras",
    slot: "Pocket gimbal on a mini tripod",
  },
  {
    title: "Fujifilm X-T5 with 35mm f/1.4",
    price: "$58.00 / 2 days",
    body: "Godox speedlight and three cards included. 41 rentals, no claims.",
    meta: "Tiong Bahru · replies in 40m",
    tag: "Cameras",
    slot: "Mirrorless body with flash",
  },
  {
    title: "Perception Sound 10.5 Kayak",
    price: "$45.00 / day",
    body: "Paddle, dry bag and roof straps. Collect two minutes from the water.",
    meta: "East Coast Park · replies in 3h",
    tag: "Water sports",
    slot: "Sea kayak on the sand",
  },
  {
    title: "Nord Stage 4 Compact 73",
    price: "$72.00 / 2 days",
    body: "Gig bag, sustain pedal and stand. Two-man lift, so bring a friend.",
    meta: "Serangoon · replies in 1h",
    tag: "Music & audio",
    slot: "Stage keyboard in a home studio",
  },
];
