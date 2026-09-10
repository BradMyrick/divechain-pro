import { feetToMeters, metersToFeet } from "./units";
import { eadMeters } from "./gas";

/**
 * Single-dive no-decompression limits for air, U.S. Navy / NOAA source.
 * Verified against 46 CFR Part 197 Appendix A (U.S. Navy Diving Manual).
 * Depths in feet of seawater; U.S. Government work, public domain.
 */
export const AIR_NDL_ROWS: readonly { ft: number; ndlMin: number }[] = [
  { ft: 35, ndlMin: 310 },
  { ft: 40, ndlMin: 200 },
  { ft: 50, ndlMin: 100 },
  { ft: 60, ndlMin: 60 },
  { ft: 70, ndlMin: 50 },
  { ft: 80, ndlMin: 40 },
  { ft: 90, ndlMin: 30 },
  { ft: 100, ndlMin: 25 },
  { ft: 110, ndlMin: 20 },
  { ft: 120, ndlMin: 15 },
  { ft: 130, ndlMin: 10 },
];

export const MAX_NDL_DEPTH_FT = 130;

export interface NdlResult {
  ndlMin: number;
  tableDepthFt: number;
  tableDepthM: number;
}

/** Round a depth in feet up to the next (deeper, more conservative) table row. */
function conservativeRow(depthFt: number) {
  return AIR_NDL_ROWS.find((r) => r.ft >= depthFt - 1e-9);
}

/** Air no-stop limit for a depth in meters. Undefined past 130 fsw: decompression territory. */
export function airNdl(depthM: number): NdlResult | undefined {
  const row = conservativeRow(metersToFeet(depthM));
  if (!row) return undefined;
  return { ndlMin: row.ndlMin, tableDepthFt: row.ft, tableDepthM: feetToMeters(row.ft) };
}

/**
 * Nitrox no-stop limit via the NOAA EAD procedure: convert to an equivalent air
 * depth, then apply the air table conservatively. Helium mixes have no EAD.
 */
export function nitroxNdl(depthM: number, o2Percent: number): NdlResult & { eadM: number } | undefined {
  const ead = eadMeters(o2Percent, depthM);
  const air = airNdl(Math.max(ead, 0));
  if (!air) return undefined;
  return { ...air, eadM: ead };
}
