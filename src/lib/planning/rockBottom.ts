import { ata } from "./units";

export interface RockBottomOptions {
  depthM: number;
  divers: number;
  stressedSacLMin?: number;
  ascentRateMMin?: number;
  midStopMin?: number;
  safetyStopMin?: number;
  safetyStopDepthM?: number;
}

export interface AscentSegment {
  label: string;
  minutes: number;
  ata: number;
}

export interface RockBottomResult {
  segments: AscentSegment[];
  gasLiters: number;
  runTimeMin: number;
}

/**
 * Rock bottom (minimum gas): what a buddy team needs to get two divers to the
 * surface sharing gas, on a stressed ascent — 1 min at bottom, ascend to half
 * depth, 1 min there, ascend to the safety stop, hang, surface.
 * Everything above the safety stop depth compresses into the safety stop leg.
 */
export function rockBottom(options: RockBottomOptions): RockBottomResult {
  const {
    depthM,
    divers,
    stressedSacLMin = 20,
    ascentRateMMin = 9,
    midStopMin = 1,
    safetyStopMin = 3,
    safetyStopDepthM = 5,
  } = options;

  const bottomAta = ata(depthM);
  const midDepth = Math.max(depthM / 2, safetyStopDepthM);
  const midAta = ata(midDepth);
  const stopAta = ata(safetyStopDepthM);

  const ascend = (fromM: number, toM: number) => Math.max(0, fromM - toM) / ascentRateMMin;
  const legAta = (fromM: number, toM: number) => (ata(fromM) + ata(toM)) / 2;

  const midAscentMin = ascend(depthM, midDepth);
  const stopAscentMin = ascend(midDepth, safetyStopDepthM);

  const segments: AscentSegment[] = [
    { label: "Problem solving at depth", minutes: 1, ata: bottomAta },
    { label: `Ascend to ${Math.round(midDepth)} m`, minutes: midAscentMin, ata: legAta(depthM, midDepth) },
    { label: `Regroup at ${Math.round(midDepth)} m`, minutes: midStopMin, ata: midAta },
    { label: `Ascend to ${Math.round(safetyStopDepthM)} m`, minutes: stopAscentMin, ata: legAta(midDepth, safetyStopDepthM) },
    { label: `Safety stop at ${Math.round(safetyStopDepthM)} m`, minutes: safetyStopMin, ata: stopAta },
  ];

  const ataMinutes = segments.reduce((sum, s) => sum + s.minutes * s.ata, 0);
  const gasLiters = divers * stressedSacLMin * ataMinutes;

  return {
    segments,
    gasLiters,
    runTimeMin: segments.reduce((sum, s) => sum + s.minutes, 0),
  };
}

/** Minimum gas expressed as tank pressure. Metric: liters water capacity. */
export function minGasBar(gasLiters: number, tankLiters: number): number {
  if (tankLiters <= 0) return 0;
  return gasLiters / tankLiters;
}

/** Minimum gas in psi for an imperial cylinder (capacity at its service pressure). */
export function minGasPsi(gasCuFtMin: number, tankCuFt: number, servicePsi: number): number {
  if (tankCuFt <= 0) return 0;
  return (gasCuFtMin / tankCuFt) * servicePsi;
}
