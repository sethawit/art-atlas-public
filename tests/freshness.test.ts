import { describe, expect, it } from "vitest";
import { daysSince, isDisplayStatusStale, DISPLAY_STATUS_FRESHNESS_DAYS } from "@/lib/institutions/freshness";

describe("daysSince", () => {
  it("computes whole days between two dates", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const then = new Date("2026-08-30T00:00:00Z");
    expect(daysSince(then, now)).toBe(10);
  });

  it("returns 0 for the same instant", () => {
    const now = new Date("2026-09-09T12:00:00Z");
    expect(daysSince(now, now)).toBe(0);
  });
});

describe("isDisplayStatusStale", () => {
  it("is not stale just under the threshold", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const lastVerified = new Date(now.getTime() - (DISPLAY_STATUS_FRESHNESS_DAYS - 1) * 24 * 60 * 60 * 1000);
    expect(isDisplayStatusStale(lastVerified, now)).toBe(false);
  });

  it("is stale just over the threshold", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const lastVerified = new Date(now.getTime() - (DISPLAY_STATUS_FRESHNESS_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(isDisplayStatusStale(lastVerified, now)).toBe(true);
  });

  it("a freshly-verified record is never stale", () => {
    const now = new Date();
    expect(isDisplayStatusStale(now, now)).toBe(false);
  });
});
