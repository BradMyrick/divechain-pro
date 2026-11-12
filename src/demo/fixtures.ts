// Curated synthetic dive history for the public demo (/demo, ?demo=1).
// Fictional diver - no real person or wallet. Doubles as test fixture data.
//
// v2 shape: each demo dive is a thin header (what the chain would return)
// plus the rich local draft (what the profile store would hold). Headers are
// derived with the production encoders (draftTiming / draftToHeader /
// coarseGeohashBytes) so the demo dogfoods the real conversion paths. The
// contentHash values are synthetic constants: demo dives never hit the chain.

import type { DiveDraft, DiveHeader, VoidInfo, Attestation } from "../lib/types";
import {
  BreathingGas,
  DecompressionType,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  UnitSystem,
} from "../lib/contracts";
import { draftToHeader } from "../lib/diveForm";
import type { NormalizedDive } from "../lib/diverStats";

export const DEMO_ADDRESS = "0x4E1aD5c09b5E6A7f3D2C8b9A0e6D5c4b3A2F1e0D" as `0x${string}`;
export const DEMO_CHAIN_ID = 43114;

export const DEMO_ATTESTERS: Record<string, { dives: number; hours: number; label: string }> = {
  "0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71": { dives: 412, hours: 268, label: "DM" },
  "0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62": { dives: 189, hours: 121, label: "Diver" },
  "0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631": { dives: 1456, hours: 1930, label: "Supervisor" },
};

const day = 86_400;
const base = Date.UTC(2024, 0, 6) / 1000;
const at = (days: number, h = 9, m = 0) => base + days * day + h * 3600 + m * 60;

/** Synthetic but stable contentHash stand-in (demo dives are never logged). */
const demoHash = (id: number): `0x${string}` =>
  (`0x${(0xd00d000000000000n + BigInt(id)).toString(16).padStart(64, "0")}`) as `0x${string}`;

interface DemoParams {
  maxDepth: number;
  bottomTimeMinutes: number;
  averageDepth?: number;
  location: string;
  waterTemp?: number;
  airTemp?: number;
  currentKnots?: number;
  bottomType?: number;
  gasType?: number;
  o2Percent?: number;
  hePercent?: number;
  n2Percent?: number;
  cylinderPressureIn?: number;
  cylinderPressureOut?: number;
  gasConsumed?: number;
  bailoutPressure?: number;
  decompType?: number;
  totalDecompTimeMinutes?: number;
  tableSchedule?: string;
  repetitiveGroup?: string;
  newRepetitiveGroup?: string;
  surfaceIntervalMinutes?: number;
  mode?: number;
  purpose?: number;
  suit?: number;
  remarks?: string;
}

function dive(id: number, dateOffsetDays: number, p: DemoParams): NormalizedDive {
  const start = at(dateOffsetDays);
  const bt = p.bottomTimeMinutes;
  const deco = p.totalDecompTimeMinutes ?? 0;
  const draft: DiveDraft = {
    diveDate: new Date(start * 1000).toISOString().slice(0, 10),
    units: UnitSystem.Metric,
    data: {
      leaveSurfaceTime: start,
      leaveBottomTime: start + bt * 60,
      reachSurfaceTime: start + (bt + deco) * 60 + 180,
      bottomTimeMinutes: bt,
      maxDepth: p.maxDepth,
      averageDepth: p.averageDepth ?? Math.round(p.maxDepth * 0.7),
      mode: p.mode ?? DiveMode.OCRecreational,
      purpose: p.purpose ?? DivePurpose.Recreational,
      suit: p.suit ?? SuitType.Wet,
    },
    env: {
      airTemp: p.airTemp ?? 29,
      waterTemp: p.waterTemp ?? 27,
      currentKnots: p.currentKnots ?? 0,
      bottomType: p.bottomType ?? BottomType.Rock,
      coords: { latitude: 11.212, longitude: -74.25 }, // Santa Marta region
      location: p.location,
      weatherConditions: "Clear",
    },
    decomp: {
      decompType: p.decompType ?? DecompressionType.NoneDecomp,
      totalDecompTimeMinutes: deco,
      maxDepthAttained: p.maxDepth,
      tableSchedule: p.tableSchedule ?? "",
      repetitiveGroup: p.repetitiveGroup ?? "",
      surfaceIntervalMinutes: p.surfaceIntervalMinutes ?? 0,
      newRepetitiveGroup: p.newRepetitiveGroup ?? "",
    },
    gas: {
      gasType: p.gasType ?? BreathingGas.Air,
      o2Percent: p.o2Percent ?? 20.9,
      hePercent: p.hePercent ?? 0,
      n2Percent: p.n2Percent ?? Math.max(0, 100 - (p.o2Percent ?? 20.9) - (p.hePercent ?? 0)),
      cylinderPressureIn: p.cylinderPressureIn ?? 207,
      cylinderPressureOut: p.cylinderPressureOut ?? 55,
      gasConsumed: p.gasConsumed ?? 152,
      bailoutPressure: p.bailoutPressure ?? 0,
    },
    remarks: p.remarks ?? "",
  };

  const header: DiveHeader = {
    ...draftToHeader(draft),
    contentHash: demoHash(id),
    id: BigInt(id),
  };
  return { ...header, draft, attestations: [] };
}

const att = (who: keyof typeof DEMO_ATTESTERS, atSec: number, nonce: number): Attestation => ({
  attester: who as `0x${string}`,
  attestedAt: atSec,
  nonce: BigInt(nonce),
});

export const DEMO_DIVES: NormalizedDive[] = [
  // ---- 2024: Caribbean recreational season (Santa Marta, Colombia) ----
  { ...dive(1, 0, { maxDepth: 18, bottomTimeMinutes: 46, location: "Taganga Reef", waterTemp: 28, suit: SuitType.Swim, remarks: "Open water checkout refresher." }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(1), 0)] },
  { ...dive(2, 0, { maxDepth: 24, bottomTimeMinutes: 38, averageDepth: 16, location: "Taganga Reef - outer", bottomType: BottomType.Coral, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68, surfaceIntervalMinutes: 129 }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(1), 1)] },
  dive(3, 21, { maxDepth: 30, bottomTimeMinutes: 41, location: "Isla del Morro", currentKnots: 1, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68, cylinderPressureOut: 62, gasConsumed: 145 }),
  { ...dive(4, 63, { maxDepth: 27, bottomTimeMinutes: 52, location: "Bahía Concha", waterTemp: 29, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68 }),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(64), 0)] },

  // ---- Voided duplicate (audit-trail demo): dive 5 superseded by 6 ----
  {
    ...dive(5, 112, { maxDepth: 32, bottomTimeMinutes: 37, location: "Wreck EL Sebastián", gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68, remarks: "Logged from memory - numbers wrong." }),
    voidInfo: {
      supersededById: 6n,
      isVoided: true,
      voidedBy: DEMO_ADDRESS,
      voidedAt: at(113),
      reason: "Depth/time transcribed incorrectly from buddy's computer; re-logged from export.",
    } satisfies VoidInfo,
  },
  { ...dive(6, 112, { maxDepth: 34, bottomTimeMinutes: 44, averageDepth: 22, location: "Wreck EL Sebastián", bottomType: BottomType.Wreck, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 6, remarks: "Corrected entry from computer export." }),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(113), 1)] },

  // ---- 2024 H2: Gulf of Mexico commercial season (surface supplied) ----
  { ...dive(7, 180, { maxDepth: 22, bottomTimeMinutes: 95, averageDepth: 18, location: "EI-325 Platform - Gulf of Mexico", waterTemp: 22, airTemp: 31, currentKnots: 1, cylinderPressureIn: 240, cylinderPressureOut: 120, gasConsumed: 120, bailoutPressure: 207, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 11, tableSchedule: "USN 20/60", repetitiveGroup: "F", mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Inspection, suit: SuitType.HotWater, remarks: "Platform jacket inspection, anodes 60% depleted." }),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(181), 0)] },
  { ...dive(8, 181, { maxDepth: 24, bottomTimeMinutes: 110, averageDepth: 19, location: "EI-325 Platform - Gulf of Mexico", waterTemp: 22, currentKnots: 1, cylinderPressureIn: 240, cylinderPressureOut: 110, gasConsumed: 130, bailoutPressure: 207, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 14, tableSchedule: "USN 20/60", repetitiveGroup: "G", newRepetitiveGroup: "D", surfaceIntervalMinutes: 84, mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Repair, suit: SuitType.HotWater, remarks: "Anode replacement, nodes B4–B7." }),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(182), 1)] },
  { ...dive(9, 215, { maxDepth: 18, bottomTimeMinutes: 130, averageDepth: 14, location: "Port Fourchon - berth 4", waterTemp: 24, bottomType: BottomType.Silt, cylinderPressureIn: 240, cylinderPressureOut: 140, gasConsumed: 100, bailoutPressure: 207, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 8, tableSchedule: "USN 30/70", repetitiveGroup: "E", mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Search, suit: SuitType.Dry, remarks: "Hull survey and prop entanglement search." }),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(216), 2)] },
  { ...dive(10, 216, { maxDepth: 18, bottomTimeMinutes: 120, averageDepth: 15, location: "Port Fourchon - berth 4", waterTemp: 24, bottomType: BottomType.Silt, cylinderPressureIn: 240, cylinderPressureOut: 145, gasConsumed: 95, bailoutPressure: 207, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 7, tableSchedule: "USN 30/70", repetitiveGroup: "F", newRepetitiveGroup: "C", surfaceIntervalMinutes: 312, mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Salvage, suit: SuitType.Dry, remarks: "Recovered dropped shackle from seabed." }),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(217), 3)] },

  // ---- 2025: deeper recreational + trimix ----
  { ...dive(11, 320, { maxDepth: 40, bottomTimeMinutes: 25, averageDepth: 28, location: "Cozumel - Palancar Deep", waterTemp: 27, currentKnots: 2, gasType: BreathingGas.Nitrox, o2Percent: 28, n2Percent: 72 }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(321), 2)] },
  { ...dive(12, 352, { maxDepth: 55, bottomTimeMinutes: 22, averageDepth: 38, location: "Bonaire - Windjammer wreck", waterTemp: 27, bottomType: BottomType.Wreck, gasType: BreathingGas.Trimix, o2Percent: 18, hePercent: 45, n2Percent: 37, cylinderPressureIn: 232, cylinderPressureOut: 70, gasConsumed: 162, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 26, suit: SuitType.Dry, remarks: "TMX 18/45. Clean run, no ceiling issues." }),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(353), 2)] },
  dive(13, 381, { maxDepth: 48, bottomTimeMinutes: 28, averageDepth: 33, location: "Bonaire - Hilma Hooker", waterTemp: 27, bottomType: BottomType.Wreck, gasType: BreathingGas.Trimix, o2Percent: 21, hePercent: 35, n2Percent: 44, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 18, suit: SuitType.Dry, purpose: DivePurpose.Photographic, remarks: "Wide-angle pass, hull penetration to hold 2." }),
  dive(14, 442, { maxDepth: 35, bottomTimeMinutes: 47, location: "Isla del Morro", currentKnots: 1, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68 }),

  // ---- 2026: mixed ----
  { ...dive(15, 560, { maxDepth: 26, bottomTimeMinutes: 84, averageDepth: 20, location: "Lake Maracaibo - riser inspection", waterTemp: 25, bottomType: BottomType.Silt, cylinderPressureIn: 240, cylinderPressureOut: 115, gasConsumed: 125, bailoutPressure: 207, decompType: DecompressionType.Standard, totalDecompTimeMinutes: 12, tableSchedule: "USN 20/50", repetitiveGroup: "F", mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Inspection, suit: SuitType.HotWater, remarks: "Riser clamp survey; visibility <1m." }),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(561), 4)] },
  { ...dive(16, 592, { maxDepth: 30, bottomTimeMinutes: 44, averageDepth: 19, location: "Taganga Reef", waterTemp: 28, gasType: BreathingGas.Nitrox, o2Percent: 32, n2Percent: 68, suit: SuitType.Swim, remarks: "Back home at Taganga. Easy dive." }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(593), 3)] },
];

export const DEMO_STATS_NOTE =
  "Demo logbook - synthetic data showing recreational and commercial records, a corrected (voided) entry, and buddy attestations.";
