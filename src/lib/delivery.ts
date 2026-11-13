/**
 * S6-09: owner delivery - the shapes the server sends and the few rules the
 * screens share.
 *
 * Whether an address is inside the radius is decided by the server, from the
 * centre of the listing's area, so the answer here is "approximately". The
 * screens only draw what the server returns.
 */

/** Where a renter wants an item delivered. The point is what the postal-code lookup found for the address. */
export type DeliveryChoice = { address: string; lat: number; lng: number };

/** What a quote says about delivery, whether or not the renter chose it. */
export type DeliveryOffer = {
  offered: boolean;
  selected: boolean;
  /** What this booking is charged: nothing unless delivery was chosen. */
  fee_cents: number;
  /** What choosing delivery would cost; present whenever the listing offers it. */
  offered_fee_cents?: number;
  radius_km?: number;
  /** The centre of the listing's area, which the radius is measured from. */
  centre?: { lat: number; lng: number };
  address?: string;
  distance_km?: number;
};

/** What an owner sets on a listing. The radius and fee are kept while delivery is off, for next time. */
export type DeliverySettings = {
  delivery_enabled: boolean;
  delivery_radius_km: number | null;
  delivery_fee_cents: number | null;
};

/** The same limits as the server's delivery_service and the listings_delivery_valid constraint. */
export const MAX_DELIVERY_RADIUS_KM = 50;
export const MAX_DELIVERY_FEE_CENTS = 50_000;

/** Refused with the server's code when an address is out of range; the renter sees this wording. */
export const OUTSIDE_RADIUS_CODE = "OUTSIDE_RADIUS";
export const OUTSIDE_RADIUS_MESSAGE = "Delivery not available to your area";

/** OneMap's public map tiles (no token needed) and the credit their terms ask for. */
export const ONEMAP_TILE_URL = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
export const ONEMAP_ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors &middot; Singapore Land Authority';

/** "Delivery available" for a listing card or page; null when the listing does not deliver. */
export function deliveryBadge(listing: Partial<DeliverySettings>): string | null {
  return listing.delivery_enabled ? "Delivery available" : null;
}

/** The first thing wrong with an owner's delivery settings, and which field it belongs under. */
export type DeliverySettingsProblem = { field: "delivery_radius_km" | "delivery_fee_cents"; message: string };

/** Checks an owner's delivery settings as typed. Nothing is required while delivery is off. */
export function validateDeliverySettings(settings: DeliverySettings): DeliverySettingsProblem | null {
  if (!settings.delivery_enabled) return null;
  const { delivery_radius_km: radius, delivery_fee_cents: fee } = settings;
  if (radius === null || !(radius > 0 && radius <= MAX_DELIVERY_RADIUS_KM)) {
    return {
      field: "delivery_radius_km",
      message: "Delivery radius must be more than 0 and at most " + MAX_DELIVERY_RADIUS_KM + " km.",
    };
  }
  if (fee === null || !(fee >= 0 && fee <= MAX_DELIVERY_FEE_CENTS)) {
    return {
      field: "delivery_fee_cents",
      message: "Delivery fee must be between S$0 and S$" + MAX_DELIVERY_FEE_CENTS / 100 + ".",
    };
  }
  return null;
}
