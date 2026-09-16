/**
 * Stand-in photography from Unsplash for the homepage's own marketing
 * content (the hero banner) — never for a real listing. A real listing
 * always has at least one uploaded photo (enforced both client-side by
 * PhotoUploadField, which only ever adds a key after a successful S3 PUT,
 * and server-side by CreateListingRequest's photo_keys validator), so its
 * card renders that photo_url directly with no stock fallback.
 */
function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=80`;
}

/** The homepage hero's showcase photo. */
export const HERO_IMAGE = unsplash("1495707902641-75cac588d2e9");
