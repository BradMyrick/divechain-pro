import { ata } from "./units";

/** Partial pressure of oxygen (ATA) for an O2 fraction (percent) at a depth in meters. */
export function ppO2(o2Percent: number, depthM: number): number {
  return (o2Percent / 100) * ata(depthM);
}

/** Maximum operating depth in meters for an O2 fraction at a ppO2 limit. */
export function modMeters(o2Percent: number, ppo2Limit: number): number {
  if (o2Percent <= 0) return 0;
  return (ppo2Limit / (o2Percent / 100) - 1) * 10;
}

/**
 * Equivalent air depth in meters for a nitrogen-based mix (no helium).
 * EAD = (FN2 / 0.79) × Pamb − 10 msw, per the NOAA nitrox EAD procedure.
 */
export function eadMeters(o2Percent: number, depthM: number): number {
  const fn2 = 1 - o2Percent / 100;
  return ((fn2 / 0.79) * ata(depthM) - 1) * 10;
}

/** Highest whole-percent O2 fraction that keeps ppO2 at or below the limit at depth. */
export function bestMix(o2Limit: number, depthM: number): number {
  const mix = (o2Limit / ata(depthM)) * 100;
  return Math.floor(mix);
}

export function gasName(o2Percent: number, hePercent = 0): string {
  if (hePercent > 0) return `TMX ${o2Percent}/${hePercent}`;
  if (o2Percent <= 21) return "Air";
  return `EAN${o2Percent}`;
}
