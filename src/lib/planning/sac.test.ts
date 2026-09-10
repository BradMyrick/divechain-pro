import { describe, it, expect } from "vitest";
import { sacRate } from "./sac";

describe("sacRate", () => {
  it("computes metric SAC and RMV", () => {
    const r = sacRate({
      tankLiters: 12, startPressure: 200, endPressure: 80,
      avgDepthM: 20, minutes: 45, system: "metric",
    });
    expect(r.sac).toBeCloseTo(10.67, 1);
    expect(r.rmv).toBeCloseTo(10.67 * 3, 1);
    expect(r.units).toBe("L/min");
  });

  it("computes imperial SAC from an AL80", () => {
    const r = sacRate({
      tankCuFt: 77.4, tankServicePsi: 3000, startPressure: 3000, endPressure: 1000,
      avgDepthM: 15.24, minutes: 40, system: "imperial",
    });
    expect(r.sac).toBeCloseTo(0.51, 1);
    expect(r.units).toBe("cu ft/min");
  });

  it("never divides by zero", () => {
    const r = sacRate({
      tankLiters: 12, startPressure: 200, endPressure: 80,
      avgDepthM: 20, minutes: 0, system: "metric",
    });
    expect(r.sac).toBe(0);
  });

  it("ignores negative gas use (bad gauge readings)", () => {
    const r = sacRate({
      tankLiters: 12, startPressure: 80, endPressure: 200,
      avgDepthM: 20, minutes: 45, system: "metric",
    });
    expect(r.sac).toBe(0);
  });
});
