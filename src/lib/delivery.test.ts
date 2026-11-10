import { describe, expect, it } from "vitest";
import { deliveryBadge, validateDeliverySettings } from "@/lib/delivery";

const on = { delivery_enabled: true, delivery_radius_km: 5, delivery_fee_cents: 800 };

describe("deliveryBadge", () => {
  it("labels a listing that delivers", () => {
    expect(deliveryBadge(on)).toBe("Delivery available");
  });

  it("says nothing for a listing that does not, or one with no delivery fields at all", () => {
    expect(deliveryBadge({ delivery_enabled: false })).toBeNull();
    expect(deliveryBadge({})).toBeNull();
  });
});

describe("validateDeliverySettings", () => {
  it("accepts good settings, and a free delivery", () => {
    expect(validateDeliverySettings(on)).toBeNull();
    expect(validateDeliverySettings({ ...on, delivery_fee_cents: 0 })).toBeNull();
  });

  it("asks for nothing while delivery is off, so a stored radius can be kept", () => {
    expect(validateDeliverySettings({ delivery_enabled: false, delivery_radius_km: null, delivery_fee_cents: null })).toBeNull();
    expect(validateDeliverySettings({ delivery_enabled: false, delivery_radius_km: 999, delivery_fee_cents: -1 })).toBeNull();
  });

  it.each([null, 0, -1, 50.5, Number.NaN])("puts a radius of %s under the radius field", (radius) => {
    expect(validateDeliverySettings({ ...on, delivery_radius_km: radius })?.field).toBe("delivery_radius_km");
  });

  it("accepts the largest radius", () => {
    expect(validateDeliverySettings({ ...on, delivery_radius_km: 50 })).toBeNull();
  });

  it.each([null, -1, 50_001, Number.NaN])("puts a fee of %s under the fee field", (fee) => {
    expect(validateDeliverySettings({ ...on, delivery_fee_cents: fee })?.field).toBe("delivery_fee_cents");
  });

  it("reports the radius before the fee when both are wrong", () => {
    expect(validateDeliverySettings({ ...on, delivery_radius_km: 0, delivery_fee_cents: -5 })?.field).toBe("delivery_radius_km");
  });
});
