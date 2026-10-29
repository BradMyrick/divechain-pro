import { describe, it, expect } from "vitest";
import { estimateWeight, SUIT_LIFT_LB, TANK_BUOYANCY_LB } from "./weight";
import { noFlyGuidance, NO_FLY_GUIDANCE } from "./nofly";

describe("weight estimator", () => {
  it("sums suit lift plus near-empty tank buoyancy in salt water", () => {
    const r = estimateWeight({ suit: "w3", tank: "al80", water: "salt" });
    expect(r.leadLb).toBeCloseTo(SUIT_LIFT_LB.w3 + TANK_BUOYANCY_LB.al80);
    expect(r.leadKg).toBeCloseTo(r.leadLb * 0.45359237);
  });

  it("drops lead in fresh water", () => {
    const salt = estimateWeight({ suit: "w5", tank: "al80", water: "salt" });
    const fresh = estimateWeight({ suit: "w5", tank: "al80", water: "fresh" });
    expect(fresh.leadLb).toBeCloseTo(salt.leadLb - 4);
  });

  it("never suggests negative lead for heavy steel", () => {
    const r = estimateWeight({ suit: "swim", tank: "s15", water: "fresh" });
    expect(r.leadLb).toBeGreaterThanOrEqual(0);
  });

  it("explains its arithmetic", () => {
    const r = estimateWeight({ suit: "w7", tank: "hp100", water: "salt" });
    expect(r.breakdown.length).toBeGreaterThanOrEqual(2);
  });
});

describe("no-fly guidance", () => {
  it("encodes the DAN 2002 consensus bands", () => {
    expect(NO_FLY_GUIDANCE.map((g) => [g.category, g.minSurfaceHours])).toEqual([
      ["single", 12],
      ["repetitive", 18],
      ["deco", 24],
    ]);
  });

  it("looks up by category", () => {
    expect(noFlyGuidance("repetitive").minSurfaceHours).toBe(18);
    expect(noFlyGuidance("deco").label).toContain("Decompression");
  });
});
