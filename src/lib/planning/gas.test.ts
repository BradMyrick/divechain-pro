import { describe, it, expect } from "vitest";
import { ppO2, modMeters, eadMeters, bestMix, gasName } from "./gas";

describe("gas", () => {
  it("computes ppO2 at depth", () => {
    expect(ppO2(21, 0)).toBeCloseTo(0.21);
    expect(ppO2(32, 30)).toBeCloseTo(1.28);
    expect(ppO2(100, 6)).toBeCloseTo(1.6);
  });

  it("computes MOD against 1.4 and 1.6 contingencies", () => {
    expect(modMeters(32, 1.4)).toBeCloseTo(33.75, 2);
    expect(modMeters(32, 1.6)).toBeCloseTo(40);
    expect(modMeters(21, 1.4)).toBeCloseTo(56.67, 2);
  });

  it("computes EAD per the NOAA procedure", () => {
    expect(eadMeters(32, 30)).toBeCloseTo(24.4, 1);
    expect(eadMeters(36, 25)).toBeCloseTo(18.4, 1);
    expect(eadMeters(21, 30)).toBeCloseTo(30, 6);
  });

  it("picks best mix for a ppO2 limit", () => {
    expect(bestMix(1.4, 30)).toBe(35);
    expect(bestMix(1.4, 18)).toBe(50);
    expect(bestMix(1.6, 21)).toBe(51);
  });

  it("names gases", () => {
    expect(gasName(21)).toBe("Air");
    expect(gasName(32)).toBe("EAN32");
    expect(gasName(21, 35)).toBe("TMX 21/35");
  });
});
