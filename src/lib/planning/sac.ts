import { ata, psiToBar, barToPsi } from "./units";

export interface SacInput {
  tankLiters?: number;
  tankCuFt?: number;
  tankServicePsi?: number;
  startPressure: number;
  endPressure: number;
  avgDepthM: number;
  minutes: number;
  system: "metric" | "imperial";
}

export interface SacResult {
  sac: number;
  rmv: number;
  units: string;
}

/**
 * Surface air consumption (liters/min or cu ft/min at surface pressure) and
 * RMV (the same rate delivered at the dive's average depth).
 */
export function sacRate(input: SacInput): SacResult {
  const used = Math.max(0, input.startPressure - input.endPressure);
  const atm = ata(input.avgDepthM);
  if (input.minutes <= 0 || atm <= 0) return { sac: 0, rmv: 0, units: input.system === "metric" ? "L/min" : "cu ft/min" };

  if (input.system === "metric" && input.tankLiters) {
    const liters = input.tankLiters * used;
    const sac = liters / (atm * input.minutes);
    return { sac, rmv: sac * atm, units: "L/min" };
  }
  if (input.system === "imperial" && input.tankCuFt && input.tankServicePsi) {
    const cuFt = (used / input.tankServicePsi) * input.tankCuFt;
    const sac = cuFt / (atm * input.minutes);
    return { sac, rmv: sac * atm, units: "cu ft/min" };
  }
  return { sac: 0, rmv: 0, units: input.system === "metric" ? "L/min" : "cu ft/min" };
}

/** Metric→imperial SAC conversion (1 L/min ≈ 0.0353 cu ft/min). */
export const sacLMinToCuFtMin = (lMin: number) => lMin * 0.0353146667;

export { psiToBar, barToPsi };
