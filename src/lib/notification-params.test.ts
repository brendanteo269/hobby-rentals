/**
 * The notifications page's URL encoding. Three places depend on it agreeing
 * with itself - the page, the filter form and the API call - and a mismatch
 * fails quietly, as a filter that seems to do nothing.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  notificationApiQuery,
  notificationsHref,
  parseNotificationFilters,
} from "@/lib/notification-params";

describe("parseNotificationFilters", () => {
  it("reads every filter", () => {
    const listingId = "66666666-6666-4666-8666-666666666666";
    expect(
      parseNotificationFilters({
        read: "unread",
        type: ["BOOKING_ACCEPTED", "BOOKING_DECLINED"],
        sort: "oldest",
        archived: "1",
        listing: listingId,
        actionable: "1",
        cursor: "abc",
      }),
    ).toEqual({
      read: "unread",
      types: ["BOOKING_ACCEPTED", "BOOKING_DECLINED"],
      listingIds: [listingId],
      actionable: true,
      sort: "oldest",
      archived: true,
      cursor: "abc",
    });
  });

  it("falls back to defaults for anything it does not recognise", () => {
    expect(parseNotificationFilters({ read: "everything", type: ["NOPE", ""], sort: "random" })).toEqual(
      DEFAULT_FILTERS,
    );
  });

  it("drops a repeated type", () => {
    expect(parseNotificationFilters({ type: ["BOOKING_ACCEPTED", "BOOKING_ACCEPTED"] }).types).toEqual([
      "BOOKING_ACCEPTED",
    ]);
  });
});

describe("notificationsHref", () => {
  it("leaves defaults out of the URL", () => {
    expect(notificationsHref(DEFAULT_FILTERS)).toBe("/notifications");
  });

  it("round-trips through the parser", () => {
    const filters = { ...DEFAULT_FILTERS, read: "read" as const, types: ["BOOKING_EXPIRED" as const], archived: true };
    const query = new URL(notificationsHref(filters), "https://example.test").searchParams;
    const params = Object.fromEntries([...new Set(query.keys())].map((key) => [key, query.getAll(key)]));

    expect(parseNotificationFilters(params)).toEqual(filters);
  });
});

describe("notificationApiQuery", () => {
  it("speaks the backend's parameter names", () => {
    const listingId = "66666666-6666-4666-8666-666666666666";
    const query = notificationApiQuery(
      {
        read: "unread", types: ["BOOKING_ACCEPTED"], listingIds: [listingId], actionable: true,
        sort: "deadline", archived: true, cursor: "c1",
      },
      20,
    );

    expect(query.get("include_archived")).toBe("true");
    expect(query.has("archived")).toBe(false);
    expect(query.getAll("type")).toEqual(["BOOKING_ACCEPTED"]);
    expect(query.getAll("listing_id")).toEqual([listingId]);
    expect(query.get("actionable")).toBe("true");
    expect(query.get("sort")).toBe("deadline");
    expect(query.get("cursor")).toBe("c1");
    expect(query.get("limit")).toBe("20");
  });
});
