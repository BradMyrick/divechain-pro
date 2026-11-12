import { describe, it, expect } from "vitest";
import { computeDiverStats, formatMinutes, isCommercialDive, type NormalizedDive } from "./diverStats";
import { DiveMode, DivePurpose, UnitSystem } from "./contracts";
import { ZERO_BYTES16 } from "./types";
function mkDive(p: {
  id: number;
  date: number; // uint32 YYYYMMDD
  depthTenths: number;
  btSec: number;
  mode?: number;
  purpose?: number;
  o2Bps?: number;
  heBps?: number;
  voided?: boolean;
  attestations?: number;
}): NormalizedDive {
  return {
    id: BigInt(p.id),
    diveDate: p.date,
    startTime: 0,
    maxDepth: p.depthTenths,
    durationSeconds: p.btSec,
    bottomTimeSeconds: p.btSec,
    mode: p.mode ?? DiveMode.OCRecreational,
    units: UnitSystem.Metric,
    o2Bps: p.o2Bps ?? 2100,
    heBps: p.heBps ?? 0,
    tableSchedule: ZERO_BYTES16,
    surfaceIntervalSeconds: 0,
    repetitiveGroup: "0x00" as `0x${string}`,
    repetitiveGroupAfterSI: "0x00" as `0x${string}`,
    coarseGeohash: "0x00000000" as `0x${string}`,
    contentHash: ("0x" + "0".repeat(64)) as `0x${string}`,
    profileURI: "",
    draft: p.purpose === undefined ? undefined : {
      diveDate: "2026-01-01",
      units: UnitSystem.Metric,
      data: {
        leaveSurfaceTime: 0, leaveBottomTime: 0, reachSurfaceTime: 0,
        bottomTimeMinutes: Math.round(p.btSec / 60),
        maxDepth: p.depthTenths / 10,
        averageDepth: Math.round((p.depthTenths / 10) * 0.7),
        mode: p.mode ?? DiveMode.OCRecreational,
        purpose: p.purpose,
        suit: 0,
      },
      env: {
        airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: 0,
        coords: { latitude: 0, longitude: 0 }, location: "", weatherConditions: "",
      },
      decomp: {
        decompType: 0, totalDecompTimeMinutes: 0,
        maxDepthAttained: p.depthTenths / 10,
        tableSchedule: "", repetitiveGroup: "", surfaceIntervalMinutes: 0, newRepetitiveGroup: "",
      },
      gas: {
        gasType: 0, o2Percent: 21, hePercent: 0, n2Percent: 79,
        cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
      },
      remarks: "",
    },
    voidInfo: p.voided ? {
      supersededById: 0n, isVoided: true,
      voidedBy: "0x0000000000000000000000000000000000000001" as `0x${string}`,
      voidedAt: 0, reason: "test",
    } : undefined,
    attestations: Array.from({ length: p.attestations ?? 0 }, (_, i) => ({
      attester: `0x000000000000000000000000000000000000000${i}` as `0x${string}`,
      attestedAt: 0,
      nonce: BigInt(i),
    })),
  };
}

describe("computeDiverStats", () => {
  const dives = [
    mkDive({ id: 1, date: 20260101, depthTenths: 180, btSec: 40 * 60, attestations: 1 }),
    mkDive({ id: 2, date: 20260201, depthTenths: 300, btSec: 50 * 60, o2Bps: 3200 }),
    mkDive({ id: 3, date: 20260301, depthTenths: 240, btSec: 100 * 60, mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Inspection, attestations: 1 }),
    mkDive({ id: 4, date: 20260401, depthTenths: 600, btSec: 90 * 60, voided: true, attestations: 1 }),
  ];

  it("excludes voided dives from totals", () => {
    const s = computeDiverStats(dives);
    expect(s.totalDives).toBe(3);
    expect(s.voidedCount).toBe(1);
    expect(s.totalBottomMinutes).toBe(190);
  });

  it("splits bottom time under the two flags", () => {
    const s = computeDiverStats(dives);
    expect(s.recBottomMinutes).toBe(90); // dives 1+2
    expect(s.commercialBottomMinutes).toBe(100); // dive 3 (surface supplied)
    expect(s.commercialDives).toBe(1);
  });

  it("tracks deepest active dive, not voided ones", () => {
    const s = computeDiverStats(dives);
    expect(s.maxDepth).toBe(30);
    expect(s.deepestDiveId).toBe(2n);
  });

  it("compares depths across unit systems before picking the deepest", () => {
    const metricShallow = mkDive({ id: 10, date: 20260101, depthTenths: 300, btSec: 40 * 60 });
    const imperialDeeper = mkDive({ id: 11, date: 20260201, depthTenths: 1100, btSec: 40 * 60 });
    imperialDeeper.units = UnitSystem.Imperial;
    const s = computeDiverStats([metricShallow, imperialDeeper]);
    expect(s.deepestDiveId).toBe(11n); // 110 ft = 33.5 m > 30 m
    expect(s.maxDepth).toBe(110);
    expect(s.maxDepthUnits).toBe(UnitSystem.Imperial);

    const imperialShallower = mkDive({ id: 12, date: 20260301, depthTenths: 950, btSec: 40 * 60 });
    imperialShallower.units = UnitSystem.Imperial;
    const s2 = computeDiverStats([metricShallow, imperialShallower]);
    expect(s2.deepestDiveId).toBe(10n); // 95 ft = 29 m < 30 m
    expect(s2.maxDepth).toBe(30);
    expect(s2.maxDepthUnits).toBe(UnitSystem.Metric);
  });

  it("computes attestation coverage over active dives", () => {
    const s = computeDiverStats(dives);
    expect(s.attestedDives).toBe(2);
    expect(s.attestationCoverage).toBeCloseTo(2 / 3);
  });

  it("labels gas mixes from basis points", () => {
    const s = computeDiverStats(dives);
    const labels = s.gasMixes.map((g) => g.label);
    expect(labels).toContain("Air");
    expect(labels).toContain("Nitrox 32%");
  });

  it("handles the empty logbook", () => {
    const s = computeDiverStats([]);
    expect(s.totalDives).toBe(0);
    expect(s.attestationCoverage).toBe(0);
  });
});

describe("isCommercialDive", () => {
  it("flags surface-supplied, saturation and working purposes as Alpha", () => {
    expect(isCommercialDive(DiveMode.SurfaceSupplied, DivePurpose.Recreational)).toBe(true);
    expect(isCommercialDive(DiveMode.Saturation)).toBe(true);
    expect(isCommercialDive(DiveMode.OCRecreational, DivePurpose.Salvage)).toBe(true);
    expect(isCommercialDive(DiveMode.OCRecreational, DivePurpose.EOD)).toBe(true);
  });

  it("keeps recreational and photo dives under Diver Down", () => {
    expect(isCommercialDive(DiveMode.OCRecreational, DivePurpose.Recreational)).toBe(false);
    expect(isCommercialDive(DiveMode.OCRecreational, DivePurpose.Photographic)).toBe(false);
    expect(isCommercialDive(DiveMode.OCRecreational, DivePurpose.Training)).toBe(false);
    expect(isCommercialDive(DiveMode.OCTechnical, undefined)).toBe(false);
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(95)).toBe("1h 35m");
  });
});
