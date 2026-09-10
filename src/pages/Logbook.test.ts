import { describe, it, expect } from "vitest";
import { groupByMonth } from "../lib/groupDives";
import type { NormalizedDive } from "../lib/diverStats";
import { BreathingGas, DecompressionType, DiveMode, DivePurpose, SuitType, UnitSystem } from "../lib/contracts";

function dive(id: number, unixDate: number): NormalizedDive {
  return {
    id: BigInt(id),
    diveDate: unixDate,
    units: UnitSystem.Metric,
    data: {
      leaveSurfaceTime: 0, leaveBottomTime: 0, reachSurfaceTime: 0,
      bottomTimeMinutes: 40, maxDepth: 18, averageDepth: 12,
      mode: DiveMode.SCUBA, purpose: DivePurpose.Recreational, suit: SuitType.Wet,
    },
    env: {
      airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: 0,
      coords: { latitude: 0, longitude: 0 }, location: "", weatherConditions: "",
    },
    decomp: {
      decompType: DecompressionType.NoneDecomp, totalDecompTimeMinutes: 0,
      maxDepthAttained: 18,
      tableSchedule: ("0x" + "0".repeat(64)) as `0x${string}`,
      repetitiveGroup: "0x00" as `0x${string}`,
      surfaceIntervalMinutes: 0,
      newRepetitiveGroup: "0x00" as `0x${string}`,
    },
    gas: {
      gasType: BreathingGas.Air, o2Percent: 2090, hePercent: 0, n2Percent: 7910,
      cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
    },
    remarks: "",
    attestations: [],
  };
}

const DAY = 86400;

describe("groupByMonth", () => {
  it("buckets dives into months newest-first, in dive order within a month", () => {
    const sep = Date.UTC(2026, 8, 15) / 1000;
    const aug1 = Date.UTC(2026, 7, 2) / 1000;
    const aug2 = Date.UTC(2026, 7, 30) / 1000;
    const groups = groupByMonth([dive(3, sep), dive(2, aug2), dive(1, aug1)]);

    expect(groups.map((g) => g.label)).toEqual(["September 2026", "August 2026"]);
    expect(groups[1].dives.map((d) => d.id.toString())).toEqual(["1", "2"]);
  });

  it("rolls over years correctly", () => {
    const dec = Date.UTC(2025, 11, 31, 12) / 1000;
    const jan = Date.UTC(2026, 0, 1, 12) / 1000;
    const groups = groupByMonth([dive(1, jan), dive(2, dec)]);
    expect(groups.map((g) => g.label)).toEqual(["January 2026", "December 2025"]);
  });

  it("handles the empty logbook", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("keeps chronological order across a long span", () => {
    const start = Date.UTC(2026, 0, 1) / 1000;
    const dives = Array.from({ length: 90 }, (_, i) => dive(i + 1, start + i * DAY));
    const groups = groupByMonth(dives);
    expect(groups[0].label).toBe("March 2026");
    expect(groups.length).toBe(3);
    expect(groups.reduce((n, g) => n + g.dives.length, 0)).toBe(90);
  });
});
