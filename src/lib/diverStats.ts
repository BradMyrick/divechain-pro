import type { DiveDraft, DiveHeader, VoidInfo, Attestation } from "./types";
import {
  DiveMode,
  DivePurpose,
  UnitSystem,
  gasMixLabel,
  tenthsToDepth,
  ymdToString,
  DIVE_MODE_LABELS,
} from "./contracts";
import { DEMO_ATTESTERS } from "../demo/fixtures";

/** A commercial (Alpha flag) dive, from the on-chain v2 mode alone:
 *  surface-supplied and saturation work. Draft purpose can extend this for
 *  local records (inspection, repair, search... fly the Alpha flag too). */
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

export function isCommercialDive(mode: number, purpose?: number): boolean {
  if (mode === DiveMode.SurfaceSupplied || mode === DiveMode.Saturation) return true;
  return purpose !== undefined && ALPHA_PURPOSES.has(purpose);
}

/** A normalized dive: the on-chain v2 header (always present) plus the rich
 *  local profile draft when this device holds it, void overlay and
 *  attestations. Everything displayable derives from these. */
export interface NormalizedDive extends DiveHeader {
  draft?: DiveDraft;
  voidInfo?: VoidInfo;
  attestations: Attestation[];
}

export interface DiverStats {
  totalDives: number;
  voidedCount: number;
  totalBottomMinutes: number;
  recBottomMinutes: number;
  commercialBottomMinutes: number;
  commercialDives: number;
  maxDepth: number; // display units (tenths/10) of the deepest dive
  maxDepthUnits: number; // units enum of the deepest dive
  deepestDiveId?: bigint;
  attestedDives: number;
  attestationCoverage: number; // 0..1 of non-voided dives
  gasMixes: { label: string; count: number }[];
  firstDiveDate?: number; // uint32 YYYYMMDD
  latestDiveDate?: number;
}

export function computeDiverStats(dives: NormalizedDive[]): DiverStats {
  const active = dives.filter((d) => !d.voidInfo?.isVoided);
  const voidedCount = dives.length - active.length;

  let totalBottomMinutes = 0;
  let recBottomMinutes = 0;
  let commercialBottomMinutes = 0;
  let commercialDives = 0;
  let maxDepth = 0;
  let maxDepthMeters = 0;
  let deepestDiveId: bigint | undefined;
  let maxDepthUnits = 0;
  let attestedDives = 0;
  let firstDiveDate: number | undefined;
  let latestDiveDate: number | undefined;
  const gasCounts = new Map<string, number>();

  for (const d of active) {
    const btSec = Number(d.bottomTimeSeconds) > 0 ? Number(d.bottomTimeSeconds) : Number(d.durationSeconds);
    const bt = Math.round(btSec / 60);
    totalBottomMinutes += bt;
    const purpose = d.draft ? Number(d.draft.data.purpose) : undefined;
    if (isCommercialDive(Number(d.mode), purpose)) {
      commercialBottomMinutes += bt;
      commercialDives++;
    } else {
      recBottomMinutes += bt;
    }
    const depthTenths = Number(d.maxDepth) || 0;
    const depthDisplay = tenthsToDepth(depthTenths);
    const depthMeters =
      Number(d.units) === UnitSystem.Imperial ? depthDisplay * 0.3048 : depthDisplay;
    if (depthMeters > maxDepthMeters) {
      maxDepth = depthDisplay;
      maxDepthMeters = depthMeters;
      deepestDiveId = d.id;
      maxDepthUnits = Number(d.units);
    }
    if (d.attestations.length > 0) attestedDives++;
    const mix = gasMixLabel(Number(d.o2Bps), Number(d.heBps));
    gasCounts.set(mix, (gasCounts.get(mix) ?? 0) + 1);
    const date = Number(d.diveDate);
    if (!firstDiveDate || date < firstDiveDate) firstDiveDate = date;
    if (!latestDiveDate || date > latestDiveDate) latestDiveDate = date;
  }

  const gasMixes = [...gasCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalDives: active.length,
    voidedCount,
    totalBottomMinutes,
    recBottomMinutes,
    commercialBottomMinutes,
    commercialDives,
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

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "2026-05-14" from a uint32 YYYYMMDD header date. */
export function diveDayString(diveDate: number): string {
  return ymdToString(Number(diveDate));
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
