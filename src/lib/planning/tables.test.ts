import { describe, it, expect } from "vitest";
import { airNdl, nitroxNdl, AIR_NDL_ROWS, MAX_NDL_DEPTH_FT } from "./tables";
import { feetToMeters, metersToFeet } from "./units";

describe("NOAA/USN air NDL table", () => {
  it("matches the 46 CFR Part 197 Appendix A source values", () => {
    const expected: [number, number][] = [
      [35, 310], [40, 200], [50, 100], [60, 60], [70, 50],
      [80, 40], [90, 30], [100, 25], [110, 20], [120, 15], [130, 10],
    ];
    expect(AIR_NDL_ROWS.map((r) => [r.ft, r.ndlMin])).toEqual(expected);
    expect(MAX_NDL_DEPTH_FT).toBe(130);
  });

  it("looks up exact depths exactly", () => {
    const r = airNdl(feetToMeters(60));
    expect(r?.ndlMin).toBe(60);
    expect(r?.tableDepthFt).toBe(60);
  });

  it("rounds in-between depths up to the conservative row", () => {
    const r = airNdl(18);
    expect(metersToFeet(18)).toBeCloseTo(59.06, 2);
    expect(r?.tableDepthFt).toBe(60);
    expect(r?.ndlMin).toBe(60);

    const r2 = airNdl(19);
    expect(r2?.tableDepthFt).toBe(70);
    expect(r2?.ndlMin).toBe(50);
  });

  it("refuses depths past the table", () => {
    expect(airNdl(feetToMeters(130.5))).toBeUndefined();
    expect(airNdl(60)).toBeUndefined();
  });

  it("gives nitrox longer limits than air through EAD", () => {
    const air = airNdl(24);
    const ean32 = nitroxNdl(24, 32);
    expect(air?.ndlMin).toBe(40);
    expect(ean32?.ndlMin).toBeGreaterThan(air!.ndlMin);
    expect(ean32?.eadM).toBeLessThan(24);
  });

  it("returns air results unchanged for 21%", () => {
    const air = airNdl(20);
    const asNitrox = nitroxNdl(20, 21);
    expect(asNitrox?.ndlMin).toBe(air?.ndlMin);
    expect(asNitrox?.eadM).toBeCloseTo(20, 6);
  });
});
