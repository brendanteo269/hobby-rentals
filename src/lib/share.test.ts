import { describe, expect, it } from "vitest";
import { absoluteUrl, shareText, telegramShareUrl, whatsappShareUrl } from "@/lib/share";

const tent = { name: "Coleman Sundome 4-Person Tent", price_per_day_cents: 1200, price_per_week_cents: null };

describe("shareText", () => {
  it("names the item with its daily price", () => {
    expect(shareText(tent)).toBe("Coleman Sundome 4-Person Tent, $12.00/day on HobbyRentals");
  });

  it("falls back to the weekly price, then to the name alone", () => {
    expect(shareText({ ...tent, price_per_day_cents: null, price_per_week_cents: 7000 })).toBe("Coleman Sundome 4-Person Tent, $70.00/week on HobbyRentals");
    expect(shareText({ ...tent, price_per_day_cents: null })).toBe("Coleman Sundome 4-Person Tent on HobbyRentals");
  });
});

describe("share links", () => {
  const url = absoluteUrl("/gear/coleman-sundome-4-person-tent-10a6532f", "https://hobbyrentals.sg");
  const text = shareText(tent);

  it("makes the canonical path absolute and adds nothing to it", () => {
    expect(url).toBe("https://hobbyrentals.sg/gear/coleman-sundome-4-person-tent-10a6532f");
  });

  it("puts the message and link in WhatsApp's text", () => {
    expect(whatsappShareUrl(url, text)).toBe(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`);
  });

  it("gives Telegram the link and message separately", () => {
    const share = new URL(telegramShareUrl(url, text));
    expect(share.origin + share.pathname).toBe("https://t.me/share/url");
    expect(share.searchParams.get("url")).toBe(url);
    expect(share.searchParams.get("text")).toBe(text);
  });
});
