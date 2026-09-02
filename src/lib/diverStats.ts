import type { DiveLog, VoidInfo, Attestation } from "./types";
import { DiveMode, DivePurpose, BreathingGas, DIVE_MODE_LABELS } from "./contracts";
import { DEMO_ATTESTERS } from "../demo/fixtures";

/** Working/commercial purposes fly the Alpha flag; everything else Diver Down. */
const ALPHA_PURPOSES = new Set<number>([
  DivePurpose.Inspection,
  DivePurpose.Repair,
  DivePurpose.Search,
  DivePurpose.Salvage,
  DivePurpose.Recovery,
  DivePurpose.Construction,
  DivePurpose.Research,
  DivePurpose.EOD,
  DivePurpose.Security,
]);

export function isCommercialDive(mode: number, purpose: number): boolean {
  return mode === DiveMode.SSA || ALPHA_PURPOSES.has(purpose);
}

export interface NormalizedDive extends DiveLog {
  voidInfo?: VoidInfo;
  attestations: Attestation[];
}

export interface DiverStats {
  totalDives: number;
  voidedCount: number;
  totalBottomMinutes: number;
  recBottomMinutes: number;
  commercialBottomMinutes: number;
  ssaDives: number;
  maxDepth: number;
  maxDepthUnits: number; // units enum of the deepest dive
  deepestDiveId?: bigint;
  attestedDives: number;
  attestationCoverage: number; // 0..1 of non-voided dives
  gasMixes: { label: string; count: number }[];
  firstDiveDate?: number;
  latestDiveDate?: number;
}

export function computeDiverStats(dives: NormalizedDive[]): DiverStats {
  const active = dives.filter((d) => !d.voidInfo?.isVoided);
  const voidedCount = dives.length - active.length;

  let totalBottomMinutes = 0;
  let recBottomMinutes = 0;
  let commercialBottomMinutes = 0;
  let ssaDives = 0;
  let maxDepth = 0;
  let deepestDiveId: bigint | undefined;
  let maxDepthUnits = 0;
  let attestedDives = 0;
  let firstDiveDate: number | undefined;
  let latestDiveDate: number | undefined;
  const gasCounts = new Map<number, number>();

  for (const d of active) {
    const bt = Number(d.data.bottomTimeMinutes) || 0;
    totalBottomMinutes += bt;
    if (isCommercialDive(Number(d.data.mode), Number(d.data.purpose))) {
      commercialBottomMinutes += bt;
    } else {
      recBottomMinutes += bt;
    }
    if (Number(d.data.mode) === DiveMode.SSA) ssaDives++;
    const depth = Number(d.data.maxDepth) || 0;
    if (depth > maxDepth) {
      maxDepth = depth;
      deepestDiveId = d.id;
      maxDepthUnits = Number(d.units);
    }
    if (d.attestations.length > 0) attestedDives++;
    gasCounts.set(Number(d.gas.gasType), (gasCounts.get(Number(d.gas.gasType)) ?? 0) + 1);
    const date = Number(d.diveDate);
    if (!firstDiveDate || date < firstDiveDate) firstDiveDate = date;
    if (!latestDiveDate || date > latestDiveDate) latestDiveDate = date;
  }

  const gasMixes = [...gasCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([gas, count]) => ({
      label: gasLabel(gas, dives),
      count,
    }));

  return {
    totalDives: active.length,
    voidedCount,
    totalBottomMinutes,
    recBottomMinutes,
    commercialBottomMinutes,
    ssaDives,
    maxDepth,
    maxDepthUnits,
    deepestDiveId,
    attestedDives,
    attestationCoverage: active.length ? attestedDives / active.length : 0,
    gasMixes,
    firstDiveDate,
    latestDiveDate,
  };
}

function gasLabel(gas: number, dives: NormalizedDive[]): string {
  const names: Record<number, string> = {
    [BreathingGas.Air]: "Air",
    [BreathingGas.Nitrox]: "Nitrox",
    [BreathingGas.Heliox]: "Heliox",
    [BreathingGas.Trimix]: "Trimix",
    [BreathingGas.Oxygen]: "Oxygen",
    [BreathingGas.Mixed]: "Mixed",
  };
  const name = names[gas] ?? "Air";
  if (gas === BreathingGas.Nitrox || gas === BreathingGas.Trimix) {
    const sample = dives.find((d) => Number(d.gas.gasType) === gas);
    if (sample) {
      const o2 = Math.round(Number(sample.gas.o2Percent) / 100);
      const he = Math.round(Number(sample.gas.hePercent) / 100);
      return gas === BreathingGas.Trimix ? `TMX ${o2}/${he}` : `Nitrox ${o2}%`;
    }
  }
  return name;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Attester quality tier, on-chain reputation from their own logbook, when known. */
export interface AttesterBadge {
  label: string;
  detail: string;
}

export function attesterBadge(attester: string, demo = false): AttesterBadge | undefined {
  if (!demo) return undefined; // chain-backed badges land with the indexer
  const a = DEMO_ATTESTERS[attester];
  if (!a) return undefined;
  return {
    label: a.label,
    detail: `${a.dives} logged dives · ${a.hours}h bottom time`,
  };
}

export { DIVE_MODE_LABELS };
