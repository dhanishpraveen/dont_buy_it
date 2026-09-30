import { describe, expect, it } from "vitest";
import { projectorDemoListings } from "./projectorDemoSeed.js";

describe("projector demo data", () => {
  it("creates five distinct projector listings across the supported access types", () => {
    expect(projectorDemoListings).toHaveLength(5);
    expect(
      new Set(projectorDemoListings.map((listing) => listing.accessType)),
    ).toEqual(new Set(["BORROW", "RENT", "BUY_USED", "BUY_NEW"]));
    expect(projectorDemoListings.map((listing) => listing.title)).toEqual([
      "Epson Projector X1",
      "BenQ Projector",
      "ViewSonic Projector",
      "Epson Projector",
      "Wanbo Mini Projector",
    ]);
  });
});
