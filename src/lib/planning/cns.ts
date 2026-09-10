/**
 * NOAA oxygen exposure limits (NOAA Diving Manual). U.S. Government work,
 * public domain. Single-dive limits verified 1.2–1.6 bar; 24-hour daily
 * limits are the published NOAA companion column.
 */
export const CNS_SINGLE_LIMITS: readonly { ppo2: number; min: number }[] = [
  { ppo2: 1.6, min: 45 },
  { ppo2: 1.5, min: 120 },
  { ppo2: 1.4, min: 150 },
  { ppo2: 1.3, min: 180 },
  { ppo2: 1.2, min: 210 },
  { ppo2: 1.1, min: 240 },
  { ppo2: 1.0, min: 300 },
  { ppo2: 0.9, min: 360 },
  { ppo2: 0.8, min: 450 },
  { ppo2: 0.7, min: 570 },
  { ppo2: 0.6, min: 720 },
];

export const CNS_DAILY_LIMITS: readonly { ppo2: number; min: number }[] = [
  { ppo2: 1.6, min: 150 },
  { ppo2: 1.5, min: 165 },
  { ppo2: 1.4, min: 180 },
  { ppo2: 1.3, min: 210 },
  { ppo2: 1.2, min: 240 },
  { ppo2: 1.1, min: 270 },
  { ppo2: 1.0, min: 300 },
];

export interface ExposureSegment {
  ppo2: number;
  minutes: number;
}

/** Single-dive CNS limit at a ppO2, linearly interpolated between NOAA anchors. */
export function cnsSingleLimit(ppo2: number): number | undefined {
  const exact = interpolateLimit(ppo2, CNS_SINGLE_LIMITS);
  if (exact !== undefined) return exact;
  return ppo2 < 0.6 ? CNS_SINGLE_LIMITS[CNS_SINGLE_LIMITS.length - 1].min : undefined;
}

/** 24-hour CNS limit; below 1.0 ATA the single-dive limit governs. */
export function cnsDailyLimit(ppo2: number): number | undefined {
  return interpolateLimit(ppo2, CNS_DAILY_LIMITS) ?? cnsSingleLimit(ppo2);
}

function interpolateLimit(ppo2: number, limits: readonly { ppo2: number; min: number }[]): number | undefined {
  if (ppo2 > limits[0].ppo2) return undefined;
  for (let i = 0; i < limits.length; i++) {
    const row = limits[i];
    if (ppo2 === row.ppo2) return row.min;
    if (i > 0 && ppo2 > limits[i].ppo2) {
      const hi = limits[i - 1];
      const lo = limits[i];
      const t = (ppo2 - lo.ppo2) / (hi.ppo2 - lo.ppo2);
      return lo.min + t * (hi.min - lo.min);
    }
  }
  return undefined;
}

/** Percent of the single-dive CNS clock consumed by a list of segments. */
export function cnsPercent(segments: ExposureSegment[]): number {
  return segments.reduce((sum, s) => {
    const limit = cnsSingleLimit(s.ppo2);
    if (!limit) return sum + s.minutes * 100;
    return sum + (s.minutes / limit) * 100;
  }, 0);
}

/** Percent of the 24-hour NOAA CNS allowance consumed by a list of segments. */
export function cnsPercentDaily(segments: ExposureSegment[]): number {
  return segments.reduce((sum, s) => {
    const limit = cnsDailyLimit(s.ppo2);
    if (!limit) return sum + s.minutes * 100;
    return sum + (s.minutes / limit) * 100;
  }, 0);
}

/**
 * Oxygen tolerance units (Hamilton REPEX): OTU/min = (2·ppO2 − 1)^0.83,
 * zero at or below 0.5 ATA. Day-1 whole-body limit is 850 OTU; the daily
 * allowance decays on consecutive exposure days.
 */
export const OTU_DAILY_LIMIT = 850;

export function otu(segments: ExposureSegment[]): number {
  return segments.reduce((sum, s) => {
    if (s.ppo2 <= 0.5) return sum;
    return sum + s.minutes * Math.pow(2 * s.ppo2 - 1, 0.83);
  }, 0);
}
