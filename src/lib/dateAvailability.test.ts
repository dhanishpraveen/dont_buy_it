import { describe, expect, it } from "vitest";
import {
  formatRangeSummary,
  getAvailabilityDates,
  getDatesBetween,
  getMonthGrid,
  toDateKey,
} from "./dateAvailability";

describe("date availability helpers", () => {
  it("builds a continuous date range between start and end", () => {
    expect(getDatesBetween("2026-09-30", "2026-10-02")).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("creates a month view with selected and available dates highlighted", () => {
    const month = new Date(2026, 8, 1);
    const cells = getMonthGrid(month, ["2026-09-30", "2026-10-01"], {
      start: "2026-10-01",
      end: null,
    });

    expect(
      cells.some((cell) => cell.key === "2026-09-30" && cell.available),
    ).toBe(true);
    expect(
      cells.some((cell) => cell.key === "2026-10-01" && cell.selected),
    ).toBe(true);
  });

  it("formats a selected date range into a compact summary", () => {
    expect(
      formatRangeSummary({
        start: "2026-10-01",
        end: "2026-10-03",
      }),
    ).toContain("Oct");
  });

  it("reads a listing availability span into individual calendar dates", () => {
    expect(
      getAvailabilityDates(
        "2026-09-30T00:00:00.000Z",
        "2026-10-02T00:00:00.000Z",
      ),
    ).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("keeps a local date key stable for the calendar", () => {
    expect(toDateKey(new Date(2026, 8, 30))).toBe("2026-09-30");
  });
});
