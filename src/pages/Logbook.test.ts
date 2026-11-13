import { describe, it, expect } from "vitest";
import { groupByMonth } from "../lib/groupDives";
import type { NormalizedDive } from "../lib/diverStats";
import { DiveMode, UnitSystem } from "../lib/contracts";
import { ZERO_BYTES16 } from "../lib/types";

function dive(id: number, ymd: number): NormalizedDive {
  return {
    id: BigInt(id),
    diveDate: ymd,
    startTime: 0,
    maxDepth: 180,
    durationSeconds: 2400,
    bottomTimeSeconds: 0,
    mode: DiveMode.OCRecreational,
    units: UnitSystem.Metric,
    o2Bps: 2100,
    heBps: 0,
    tableSchedule: ZERO_BYTES16,
    surfaceIntervalSeconds: 0,
    repetitiveGroup: "0x00" as `0x${string}`,
    repetitiveGroupAfterSI: "0x00" as `0x${string}`,
    coarseGeohash: "0x00000000" as `0x${string}`,
    contentHash: ("0x" + "0".repeat(64)) as `0x${string}`,
    profileURI: "",
    attestations: [],
  };
}

const ymdOf = (offsetDays: number): number => {
  const d = new Date(Date.UTC(2026, 0, 1) + offsetDays * 86400000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};

describe("groupByMonth (v2 YYYYMMDD header dates)", () => {
  it("buckets dives into months newest-first, in dive order within a month", () => {
    const groups = groupByMonth([dive(3, 20260915), dive(2, 20260830), dive(1, 20260802)]);
    expect(groups.map((g) => g.label)).toEqual(["September 2026", "August 2026"]);
    expect(groups[1].dives.map((d) => d.id.toString())).toEqual(["1", "2"]);
  });

  it("rolls over years correctly", () => {
    const groups = groupByMonth([dive(1, 20260101), dive(2, 20251231)]);
    expect(groups.map((g) => g.label)).toEqual(["January 2026", "December 2025"]);
  });

  it("handles the empty logbook", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("keeps chronological order across a long span", () => {
    const dives = Array.from({ length: 90 }, (_, i) => dive(i + 1, ymdOf(i)));
    const groups = groupByMonth(dives);
    expect(groups[0].label).toBe("March 2026");
    expect(groups.length).toBe(3);
    expect(groups.reduce((n, g) => n + g.dives.length, 0)).toBe(90);
  });
});
