import { describe, it, expect } from "vitest";
import { rockBottom, minGasBar, minGasPsi } from "./rockBottom";

describe("rockBottom", () => {
  it("builds the standard stressed-ascent profile for 30 m", () => {
    const rb = rockBottom({ depthM: 30, divers: 2 });
    expect(rb.segments[0]).toEqual({ label: "Problem solving at depth", minutes: 1, ata: 4 });
    expect(rb.segments).toHaveLength(5);
    expect(rb.runTimeMin).toBeGreaterThan(6);
    const gasPerDiver = 20 * rb.segments.reduce((s, x) => s + x.minutes * x.ata, 0);
    expect(rb.gasLiters).toBeCloseTo(2 * gasPerDiver, 5);
  });

  it("produces sensible min gas for a 30 m buddy pair on double 12s", () => {
    const rb = rockBottom({ depthM: 30, divers: 2 });
    expect(rb.gasLiters).toBeGreaterThan(600);
    expect(rb.gasLiters).toBeLessThan(900);
    expect(minGasBar(rb.gasLiters, 24)).toBeCloseTo(rb.gasLiters / 24, 5);
  });

  it("never yields fewer than the safety-stop-only minimum for shallow dives", () => {
    const shallow = rockBottom({ depthM: 8, divers: 2 });
    const deep = rockBottom({ depthM: 40, divers: 2 });
    expect(deep.gasLiters).toBeGreaterThan(shallow.gasLiters);
  });

  it("scales with team size and stressed SAC", () => {
    const two = rockBottom({ depthM: 25, divers: 2 });
    const three = rockBottom({ depthM: 25, divers: 3 });
    expect(three.gasLiters).toBeCloseTo((3 / 2) * two.gasLiters, 5);
  });

  it("converts to imperial tank pressure", () => {
    expect(minGasPsi(77.4, 77.4, 3000)).toBeCloseTo(3000);
  });
});
