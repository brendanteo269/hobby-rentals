import type { ListingCategory } from "@/lib/listings";

/**
 * Stand-in photography from Unsplash, until real photo hosting is wired up
 * (see the comment on `ListingCard.primary_photo_key` in `lib/listings.ts`).
 * One curated photo per category, so a real listing's card looks plausible
 * rather than showing the bare `ImageSlot` placeholder.
 */
function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=80`;
}

export const CATEGORY_IMAGES: Record<ListingCategory, string> = {
  PHOTOGRAPHY_VIDEOGRAPHY: unsplash("1502920917128-1aa500764cbd"),
  CAMPING_OUTDOOR: unsplash("1504280390367-361c6d9f38f4"),
  HIKING: unsplash("1551632811-561732d1e306"),
  POWER_TOOLS_DIY: unsplash("1504148455328-c376907d081c"),
  SPORTS_FITNESS: unsplash("1571019613454-1cb2f99b2d8b"),
  MUSIC_AUDIO: unsplash("1511379938547-c1f69419868d"),
  GAMING_TECH: unsplash("1550745165-9bc0b252726f"),
  EVENTS_PARTY: unsplash("1492684223066-81342ee5ff30"),
  COOKING_BAKING: unsplash("1495521821757-a1efb6729352"),
  GARDENING: unsplash("1416879595882-3373a0480b5b"),
  OTHER: unsplash("1506806732259-39c2d0268443"),
};

/** The homepage hero's showcase photo. */
export const HERO_IMAGE = unsplash("1495707902641-75cac588d2e9");
