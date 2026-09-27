import { describe, it, expect } from "vitest";
import {
  isIsoDate,
  sanitizeTravelDates,
  sanitizeTravelDestinations,
  sanitizeAvailabilityStatus,
  sanitizeBudgetRange,
  availabilityColumnUpdates,
  AVAILABILITY_STATUSES,
  AVAILABILITY_COLUMN_FIELDS,
  MAX_TRAVEL_DATES,
  MAX_TRAVEL_DESTINATIONS,
  MAX_TRAVEL_DESTINATION_LEN,
  MAX_BUDGET_RANGE_LEN,
} from "@/lib/muse-availability";

describe("isIsoDate", () => {
  it("accepts real calendar dates including a leap day", () => {
    expect(isIsoDate("2026-10-01")).toBe(true);
    expect(isIsoDate("2000-02-29")).toBe(true);
  });

  it("rejects rolled-over / malformed / non-string dates", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-1-1", "2026/10/01", "", null, undefined, 20261001, {}]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });
});

describe("sanitizeTravelDates", () => {
  it("keeps valid ranges and drops malformed or reversed ones", () => {
    expect(sanitizeTravelDates([
      { from: "2026-10-01", to: "2026-10-15" },
      { from: "not-a-date", to: "2026-11-01" },
      { from: "2026-11-01", to: "nope" },
      { from: "2026-12-01", to: "2026-11-01" },
      { from: "2027-01-01", to: "2027-01-01" },
      { from: "2026-02-30", to: "2026-03-01" },
    ])).toEqual([
      { from: "2026-10-01", to: "2026-10-15" },
      { from: "2027-01-01", to: "2027-01-01" },
    ]);
  });

  it("returns [] for non-array input and ignores non-object entries", () => {
    expect(sanitizeTravelDates("2026-10-01")).toEqual([]);
    expect(sanitizeTravelDates(null)).toEqual([]);
    expect(sanitizeTravelDates(["x", 5, null])).toEqual([]);
  });

  it("caps the number of stored ranges", () => {
    const many = Array.from({ length: MAX_TRAVEL_DATES + 5 }, (_, i) => ({ from: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, to: "2026-12-31" }));
    expect(sanitizeTravelDates(many)).toHaveLength(MAX_TRAVEL_DATES);
  });
});

describe("sanitizeTravelDestinations", () => {
  it("accepts an array, trims, de-dupes case-insensitively, first spelling wins", () => {
    expect(sanitizeTravelDestinations(["New York", "  LA  ", "new york", "", "LA"])).toEqual(["New York", "LA"]);
  });

  it("accepts a legacy comma-separated string", () => {
    expect(sanitizeTravelDestinations("NYC, LA , NYC")).toEqual(["NYC", "LA"]);
  });

  it("drops non-string entries and caps the count", () => {
    expect(sanitizeTravelDestinations([1, null, {}, "Seoul"])).toEqual(["Seoul"]);
    const many = Array.from({ length: MAX_TRAVEL_DESTINATIONS + 5 }, (_, i) => `City ${i}`);
    expect(sanitizeTravelDestinations(many)).toHaveLength(MAX_TRAVEL_DESTINATIONS);
  });

  it("caps each destination's length", () => {
    const long = "x".repeat(MAX_TRAVEL_DESTINATION_LEN + 20);
    expect(sanitizeTravelDestinations([long])[0]).toHaveLength(MAX_TRAVEL_DESTINATION_LEN);
  });

  it("returns [] for unsupported input", () => {
    expect(sanitizeTravelDestinations(42)).toEqual([]);
    expect(sanitizeTravelDestinations(null)).toEqual([]);
  });
});

describe("sanitizeAvailabilityStatus", () => {
  it("accepts exactly the three statuses", () => {
    for (const s of AVAILABILITY_STATUSES) expect(sanitizeAvailabilityStatus(s)).toBe(s);
  });

  it("returns undefined for anything else", () => {
    for (const bad of ["online", "", "AVAILABLE", null, 3, {}]) expect(sanitizeAvailabilityStatus(bad)).toBeUndefined();
  });
});

describe("sanitizeBudgetRange", () => {
  it("trims and bounds a string", () => {
    expect(sanitizeBudgetRange("  $500-$2,000  ")).toBe("$500-$2,000");
    expect(sanitizeBudgetRange("")).toBe("");
    expect(sanitizeBudgetRange("x".repeat(MAX_BUDGET_RANGE_LEN + 10))).toHaveLength(MAX_BUDGET_RANGE_LEN);
  });

  it("returns undefined for non-strings", () => {
    for (const bad of [500, null, undefined, {}, []]) expect(sanitizeBudgetRange(bad)).toBeUndefined();
  });
});

describe("availabilityColumnUpdates", () => {
  it("returns only the keys present in the input", () => {
    expect(availabilityColumnUpdates({})).toEqual({});
    expect(availabilityColumnUpdates({ availability_status: "busy" })).toEqual({ availability_status: "busy" });
  });

  it("sanitises every supported column", () => {
    expect(availabilityColumnUpdates({
      travel_dates: [{ from: "2026-10-01", to: "2026-10-05" }, { from: "x", to: "2026-10-05" }],
      travel_destinations: "NYC, LA, nyc",
      availability_status: "available",
      budget_range: " $1k–$2k ",
    })).toEqual({
      travel_dates: [{ from: "2026-10-01", to: "2026-10-05" }],
      travel_destinations: ["NYC", "LA"],
      availability_status: "available",
      budget_range: "$1k–$2k",
    });
  });

  it("persists an empty array (explicit clear) but drops a non-array value", () => {
    expect(availabilityColumnUpdates({ travel_dates: [] }).travel_dates).toEqual([]);
    expect(availabilityColumnUpdates({ travel_dates: "garbage" })).toEqual({});
  });

  it("drops invalid status/budget and never wipes a column via a bad value", () => {
    expect(availabilityColumnUpdates({ availability_status: "bogus", budget_range: 123 })).toEqual({});
  });

  it("ignores unrelated keys", () => {
    expect(availabilityColumnUpdates({ name: "Ada", travel_dates: [] })).toEqual({ travel_dates: [] });
    expect(AVAILABILITY_COLUMN_FIELDS).toEqual(["travel_dates", "travel_destinations", "availability_status", "budget_range"]);
  });
});
