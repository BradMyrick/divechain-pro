import { describe, it, expect } from "vitest";
import { computeDiverStats, formatMinutes, isCommercialDive, type NormalizedDive } from "./diverStats";
import { BreathingGas, DecompressionType, DiveMode, DivePurpose, SuitType, UnitSystem } from "./contracts";

function mkDive(p: {
  id: number;
  date: number;
  depth: number;
  bt: number;
  mode?: number;
  purpose?: number;
  gas?: number;
  voided?: boolean;
  attestations?: number;
}): NormalizedDive {
  return {
    id: BigInt(p.id),
    diveDate: p.date,
    units: UnitSystem.Metric,
    data: {
      leaveSurfaceTime: 0, leaveBottomTime: 0, reachSurfaceTime: 0,
      bottomTimeMinutes: p.bt,
      maxDepth: p.depth,
      averageDepth: Math.round(p.depth * 0.7),
      mode: p.mode ?? DiveMode.SCUBA,
      purpose: p.purpose ?? DivePurpose.Recreational,
      suit: SuitType.Wet,
    },
    env: {
      airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: 0,
      coords: { latitude: 0, longitude: 0 }, location: "", weatherConditions: "",
    },
    decomp: {
      decompType: DecompressionType.NoneDecomp, totalDecompTimeMinutes: 0,
      maxDepthAttained: p.depth,
      tableSchedule: ("0x" + "0".repeat(64)) as `0x${string}`,
      repetitiveGroup: "0x00" as `0x${string}`,
      surfaceIntervalMinutes: 0,
      newRepetitiveGroup: "0x00" as `0x${string}`,
    },
    gas: {
      gasType: p.gas ?? BreathingGas.Air, o2Percent: 2090, hePercent: 0, n2Percent: 7910,
      cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
    },
    remarks: "",
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
    mkDive({ id: 1, date: 100, depth: 18, bt: 40, attestations: 1 }),
    mkDive({ id: 2, date: 200, depth: 30, bt: 50, gas: BreathingGas.Nitrox }),
    mkDive({ id: 3, date: 300, depth: 24, bt: 100, mode: DiveMode.SSA, purpose: DivePurpose.Inspection, attestations: 1 }),
    mkDive({ id: 4, date: 400, depth: 60, bt: 90, voided: true, attestations: 1 }),
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
    expect(s.commercialBottomMinutes).toBe(100); // dive 3 (SSA)
    expect(s.ssaDives).toBe(1);
  });

  it("tracks deepest active dive, not voided ones", () => {
    const s = computeDiverStats(dives);
    expect(s.maxDepth).toBe(30);
    expect(s.deepestDiveId).toBe(2n);
  });

  it("computes attestation coverage over active dives", () => {
    const s = computeDiverStats(dives);
    expect(s.attestedDives).toBe(2);
    expect(s.attestationCoverage).toBeCloseTo(2 / 3);
  });

  it("handles the empty logbook", () => {
    const s = computeDiverStats([]);
    expect(s.totalDives).toBe(0);
    expect(s.attestationCoverage).toBe(0);
  });
});

describe("isCommercialDive", () => {
  it("flags SSA and working purposes as Alpha", () => {
    expect(isCommercialDive(DiveMode.SSA, DivePurpose.Recreational)).toBe(true);
    expect(isCommercialDive(DiveMode.SCUBA, DivePurpose.Salvage)).toBe(true);
    expect(isCommercialDive(DiveMode.SCUBA, DivePurpose.EOD)).toBe(true);
  });

  it("keeps recreational and photo dives under Diver Down", () => {
    expect(isCommercialDive(DiveMode.SCUBA, DivePurpose.Recreational)).toBe(false);
    expect(isCommercialDive(DiveMode.SCUBA, DivePurpose.Photographic)).toBe(false);
    expect(isCommercialDive(DiveMode.SCUBA, DivePurpose.Training)).toBe(false);
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(95)).toBe("1h 35m");
  });
});
