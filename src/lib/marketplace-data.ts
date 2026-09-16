/**
 * Placeholder marketplace content for the landing page.
 *
 * These arrays stand in for queries against Supabase. Keeping them in one
 * module means swapping the source later touches this file and nothing that
 * renders it.
 */

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=80`;

export type Category = { name: string; count: string };
export type Listing = {
  title: string;
  price: string;
  category: string;
  location: string;
  rating: number;
  /** Alt text for the photo, and its caption before one existed. */
  slot: string;
  photoUrl: string;
};

export const CATEGORIES: Category[] = [
  { name: "Cameras & drones", count: "140+ available" },
  { name: "Camping & hiking", count: "220+ available" },
  { name: "Water sports", count: "90+ available" },
  { name: "Music & studio audio", count: "150+ available" },
  { name: "Power tools & DIY", count: "110+ available" },
];

export const LISTINGS: Listing[] = [
  {
    title: "DJI Osmo Pocket 4 Creator Combo",
    price: "$49.00 / 2 days",
    category: "Cameras",
    location: "Bukit Timah",
    rating: 4.9,
    slot: "Pocket gimbal on a mini tripod",
    photoUrl: unsplash("1495707902641-75cac588d2e9"),
  },
  {
    title: "Fujifilm X-T5 with 35mm f/1.4",
    price: "$58.00 / 2 days",
    category: "Cameras",
    location: "Tiong Bahru",
    rating: 4.9,
    slot: "Mirrorless body with flash",
    photoUrl: unsplash("1516035069371-29a1b244cc32"),
  },
  {
    title: "Perception Sound 10.5 Kayak",
    price: "$45.00 / day",
    category: "Water sports",
    location: "East Coast Park",
    rating: 4.8,
    slot: "Sea kayak on the sand",
    photoUrl: unsplash("1500534623283-312aade485b7"),
  },
  {
    title: "Nord Stage 4 Compact 73",
    price: "$72.00 / 2 days",
    category: "Music & audio",
    location: "Serangoon",
    rating: 4.8,
    slot: "Stage keyboard in a home studio",
    photoUrl: unsplash("1520523839897-bd0b52f945a0"),
  },
];
