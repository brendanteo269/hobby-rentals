/**
 * S5-16: sharing a listing or bundle. Safe for client components.
 *
 * The link is always the canonical public /gear URL (S5-01), absolute, and
 * carries nothing about who shared it: no member id, session or tracking
 * parameter (Scenario 3). WhatsApp and Telegram take the message through
 * their own share links, so nothing here needs an account or an API key.
 */

import { formatMoney } from "@/lib/format";

export type Shareable = {
  name: string;
  price_per_day_cents: number | null;
  price_per_week_cents: number | null;
};

/** "Coleman Sundome 4-Person Tent is available to rent on HobbyRentals for $12.00/day." */
export function shareText(item: Shareable): string {
  const price =
    item.price_per_day_cents !== null
      ? `${formatMoney(item.price_per_day_cents)}/day`
      : item.price_per_week_cents !== null
        ? `${formatMoney(item.price_per_week_cents)}/week`
        : null;
  const sentence = `${item.name} is available to rent on HobbyRentals`;
  return price ? `${sentence} for ${price}.` : `${sentence}.`;
}

/** The public path as a full URL on the site's own origin. */
export function absoluteUrl(path: string, origin: string | URL): string {
  return new URL(path, origin).toString();
}

export function whatsappShareUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
