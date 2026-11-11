import { describe, expect, it } from "vitest";
import { forecastSpanLabel, forecastWeekLabel, forecastWeekSpanLabel, forecastWeeksEnd, forecastWeeksPhrase, holidayBands } from "@/lib/demand-forecast";

describe("forecast week labels", () => {
  it("names a week by its Monday in Singapore time", () => {
    expect(forecastWeekLabel("2026-12-07")).toBe("7 Dec");
  });

  it("reads as a sentence for one week or several", () => {
    expect(forecastWeeksPhrase(["2026-12-07"])).toBe("the week of 7 Dec");
    expect(forecastWeeksPhrase(["2026-12-07", "2026-12-21"])).toBe("the weeks of 7 Dec and 21 Dec");
    expect(forecastWeeksPhrase(["2026-11-30", "2026-12-07", "2026-12-21"])).toBe("the weeks of 30 Nov, 7 Dec and 21 Dec");
  });
});

describe("forecast spans", () => {
  it("collapses a shared month and keeps a single day short", () => {
    expect(forecastSpanLabel("2026-11-27", "2026-11-29")).toBe("27–29 Nov");
    expect(forecastSpanLabel("2026-11-30", "2026-12-02")).toBe("30 Nov – 2 Dec");
    expect(forecastSpanLabel("2026-11-27", "2026-11-27")).toBe("27 Nov");
  });

  it("names a whole week Monday to Sunday", () => {
    expect(forecastWeekSpanLabel("2026-11-23")).toBe("23–29 Nov");
    expect(forecastWeekSpanLabel("2026-12-28")).toBe("28 Dec – 3 Jan");
  });

  it("ends on the Sunday of the last week, across a year", () => {
    expect(forecastWeeksEnd("2027-01-04")).toBe("10 Jan");
    expect(forecastWeeksEnd("2026-12-28")).toBe("3 Jan");
  });
});

describe("holiday bands", () => {
  const week = (week_start: string, holiday: string | null = null, holiday_kind: "SCHOOL_HOLIDAY" | "PUBLIC_HOLIDAY" | null = null) => ({ week_start, holiday, holiday_kind });

  it("says a school break once across the weeks it covers", () => {
    const weeks = [
      week("2026-11-16"),
      ...["2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"].map((w) => week(w, "Year-end school holidays", "SCHOOL_HOLIDAY")),
      week("2027-01-04"),
    ];

    expect(holidayBands(weeks)).toEqual([{ label: "School break", span: "23 Nov – 3 Jan", startIndex: 1, length: 6 }]);
  });

  it("names a public holiday and keeps separate holidays apart", () => {
    const weeks = [week("2027-02-01"), week("2027-02-08", "Chinese New Year", "PUBLIC_HOLIDAY"), week("2027-02-15"), week("2027-03-08", "Hari Raya Puasa", "PUBLIC_HOLIDAY")];

    expect(holidayBands(weeks).map((band) => [band.label, band.startIndex, band.length])).toEqual([["Chinese New Year", 1, 1], ["Hari Raya Puasa", 3, 1]]);
  });
});
