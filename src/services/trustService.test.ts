import { describe, expect, it } from "vitest";
import { calculateTrustScore, getTrustLevel } from "./trustService";

describe("trustService", () => {
  it("marks a user with no activity as a new member", () => {
    const result = calculateTrustScore({
      emailVerified: false,
      accountAgeDays: 0,
      completedExchanges: 0,
      successfulReturns: 0,
      reviewCount: 0,
      averageRating: null,
      cancellationCount: 0,
    });

    expect(result).toBeNull();
    expect(
      getTrustLevel({
        score: null,
        completedExchanges: 0,
        successfulReturns: 0,
        reviewCount: 0,
      }),
    ).toBe("New member");
  });

  it("returns a transparent score for established users", () => {
    const result = calculateTrustScore({
      emailVerified: true,
      accountAgeDays: 180,
      completedExchanges: 12,
      successfulReturns: 10,
      reviewCount: 8,
      averageRating: 4.7,
      cancellationCount: 1,
    });

    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
    expect(
      getTrustLevel({
        score: result,
        completedExchanges: 12,
        successfulReturns: 10,
        reviewCount: 8,
      }),
    ).toBe("Highly trusted");
  });
});
