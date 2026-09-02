// Curated synthetic dive history for the public demo (/demo, ?demo=1).
// Fictional diver — no real person or wallet. Doubles as test fixture data.
// Shapes mirror the normalized types in src/lib/types.ts (numeric fields as
// numbers, id as bigint).

import type { DiveLog, VoidInfo, Attestation } from "../lib/types";
import { BreathingGas, DecompressionType, DiveMode, DivePurpose, SuitType, BottomType, UnitSystem } from "../lib/contracts";

export interface DemoDive extends DiveLog {
  voidInfo?: VoidInfo;
  attestations: Attestation[];
}

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

const zeroB32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

function dive(
  id: number,
  dateOffsetDays: number,
  p: Partial<DiveLog["data"]> & { maxDepth: number; bottomTimeMinutes: number },
  env: Partial<DiveLog["env"]> & { location: string },
  gas: Partial<DiveLog["gas"]>,
  decomp: Partial<DiveLog["decomp"]> = {},
  mode: DiveMode = DiveMode.SCUBA,
  purpose: DivePurpose = DivePurpose.Recreational,
  suit: SuitType = SuitType.Wet,
  remarks = "",
): DemoDive {
  const start = at(dateOffsetDays);
  return {
    id: BigInt(id),
    diveDate: start - (start % day),
    units: UnitSystem.Metric,
    data: {
      leaveSurfaceTime: start,
      leaveBottomTime: start + p.bottomTimeMinutes * 60,
      reachSurfaceTime: start + (p.bottomTimeMinutes + Number(decomp.totalDecompTimeMinutes ?? 0)) * 60 + 180,
      bottomTimeMinutes: p.bottomTimeMinutes,
      maxDepth: p.maxDepth,
      averageDepth: p.averageDepth ?? Math.round(p.maxDepth * 0.7),
      mode,
      purpose,
      suit,
    },
    env: {
      airTemp: env.airTemp ?? 29,
      waterTemp: env.waterTemp ?? 27,
      currentKnots: env.currentKnots ?? 0,
      bottomType: env.bottomType ?? BottomType.Rock,
      coords: env.coords ?? { latitude: 1_115_000, longitude: -7_425_000 }, // Santa Marta
      location: env.location,
      weatherConditions: env.weatherConditions ?? "Clear",
    },
    decomp: {
      decompType: decomp.decompType ?? DecompressionType.NoneDecomp,
      totalDecompTimeMinutes: decomp.totalDecompTimeMinutes ?? 0,
      maxDepthAttained: decomp.maxDepthAttained ?? p.maxDepth,
      tableSchedule: decomp.tableSchedule ?? zeroB32,
      repetitiveGroup: decomp.repetitiveGroup ?? ("0x00" as `0x${string}`),
      surfaceIntervalMinutes: decomp.surfaceIntervalMinutes ?? 0,
      newRepetitiveGroup: decomp.newRepetitiveGroup ?? ("0x00" as `0x${string}`),
    },
    gas: {
      gasType: gas.gasType ?? BreathingGas.Air,
      o2Percent: gas.o2Percent ?? 2_090,
      hePercent: gas.hePercent ?? 0,
      n2Percent: gas.n2Percent ?? 7_910,
      cylinderPressureIn: gas.cylinderPressureIn ?? 2_070,
      cylinderPressureOut: gas.cylinderPressureOut ?? 550,
      gasConsumed: gas.gasConsumed ?? 1_520,
      bailoutPressure: gas.bailoutPressure ?? 0,
    },
    remarks,
    attestations: [],
  };
}

const att = (who: keyof typeof DEMO_ATTESTERS, atSec: number, nonce: number): Attestation => ({
  attester: who as `0x${string}`,
  attestedAt: atSec,
  nonce: BigInt(nonce),
});

export const DEMO_DIVES: DemoDive[] = [
  // ---- 2024: Caribbean recreational season (Santa Marta, Colombia) ----
  { ...dive(1, 0, { maxDepth: 18, bottomTimeMinutes: 46 }, { location: "Taganga Reef", waterTemp: 28 },
      {}, {}, DiveMode.SCUBA, DivePurpose.Recreational, SuitType.Swim, "Open water checkout refresher."),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(1), 0)] },
  { ...dive(2, 0, { maxDepth: 24, bottomTimeMinutes: 38, averageDepth: 16 },
      { location: "Taganga Reef — outer", bottomType: BottomType.Coral }, { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(1), 1)] },
  dive(3, 21, { maxDepth: 30, bottomTimeMinutes: 41 }, { location: "Isla del Morro", currentKnots: 1 },
    { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800, cylinderPressureOut: 620, gasConsumed: 1_450 }),
  { ...dive(4, 63, { maxDepth: 27, bottomTimeMinutes: 52 }, { location: "Bahía Concha", waterTemp: 29 },
      { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 }),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(64), 0)] },

  // ---- Voided duplicate (audit-trail demo): dive 5 superseded by 6 ----
  {
    ...dive(5, 112, { maxDepth: 32, bottomTimeMinutes: 37 }, { location: "Wreck EL Sebastián" },
      { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 },
      {}, DiveMode.SCUBA, DivePurpose.Recreational, SuitType.Wet, "Logged from memory — numbers wrong."),
    voidInfo: {
      supersededById: 6n,
      isVoided: true,
      voidedBy: DEMO_ADDRESS,
      voidedAt: at(113),
      reason: "Depth/time transcribed incorrectly from buddy's computer; re-logged from export.",
    },
  },
  { ...dive(6, 112, { maxDepth: 34, bottomTimeMinutes: 44, averageDepth: 22 },
      { location: "Wreck EL Sebastián", bottomType: BottomType.Wreck },
      { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 6 }, DiveMode.SCUBA,
      DivePurpose.Recreational, SuitType.Wet, "Corrected entry from computer export."),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(113), 1)] },

  // ---- 2024 H2: Gulf of Mexico commercial season (SSA) ----
  { ...dive(7, 180, { maxDepth: 22, bottomTimeMinutes: 95, averageDepth: 18 },
      { location: "EI-325 Platform — Gulf of Mexico", waterTemp: 22, airTemp: 31, currentKnots: 1, bottomType: BottomType.Rock },
      { gasType: BreathingGas.Air, cylinderPressureIn: 2_400, cylinderPressureOut: 1_200, gasConsumed: 1_200, bailoutPressure: 2_070 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 11 },
      DiveMode.SSA, DivePurpose.Inspection, SuitType.HotWater, "Platform jacket inspection, anodes 60% depleted."),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(181), 0)] },
  { ...dive(8, 181, { maxDepth: 24, bottomTimeMinutes: 110, averageDepth: 19 },
      { location: "EI-325 Platform — Gulf of Mexico", waterTemp: 22, currentKnots: 1 },
      { gasType: BreathingGas.Air, cylinderPressureIn: 2_400, cylinderPressureOut: 1_100, gasConsumed: 1_300, bailoutPressure: 2_070 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 14 },
      DiveMode.SSA, DivePurpose.Repair, SuitType.HotWater, "Anode replacement, nodes B4–B7."),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(182), 1)] },
  { ...dive(9, 215, { maxDepth: 18, bottomTimeMinutes: 130, averageDepth: 14 },
      { location: "Port Fourchon — berth 4", waterTemp: 24, bottomType: BottomType.Silt },
      { gasType: BreathingGas.Air, cylinderPressureIn: 2_400, cylinderPressureOut: 1_400, gasConsumed: 1_000, bailoutPressure: 2_070 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 8 },
      DiveMode.SSA, DivePurpose.Search, SuitType.Dry, "Hull survey and prop entanglement search."),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(216), 2)] },
  { ...dive(10, 216, { maxDepth: 18, bottomTimeMinutes: 120, averageDepth: 15 },
      { location: "Port Fourchon — berth 4", waterTemp: 24, bottomType: BottomType.Silt },
      { gasType: BreathingGas.Air, cylinderPressureIn: 2_400, cylinderPressureOut: 1_450, gasConsumed: 950, bailoutPressure: 2_070 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 7 },
      DiveMode.SSA, DivePurpose.Salvage, SuitType.Dry, "Recovered dropped shackle from seabed."),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(217), 3)] },

  // ---- 2025: deeper recreational + trimix ----
  { ...dive(11, 320, { maxDepth: 40, bottomTimeMinutes: 25, averageDepth: 28 },
      { location: "Cozumel — Palancar Deep", waterTemp: 27, currentKnots: 2 },
      { gasType: BreathingGas.Nitrox, o2Percent: 2_800, n2Percent: 7_200 }),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(321), 2)] },
  { ...dive(12, 352, { maxDepth: 55, bottomTimeMinutes: 22, averageDepth: 38 },
      { location: "Bonaire — Windjammer wreck", waterTemp: 27, bottomType: BottomType.Wreck },
      { gasType: BreathingGas.Trimix, o2Percent: 1_800, hePercent: 4_500, n2Percent: 3_700, cylinderPressureIn: 2_320, cylinderPressureOut: 700, gasConsumed: 1_620 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 26 },
      DiveMode.SCUBA, DivePurpose.Recreational, SuitType.Dry, "TMX 18/45. Clean run, no ceiling issues."),
    attestations: [att("0x9f2B7cE41a8D3F60b5C1e7A9d4F28c6B0E5a3D71", at(353), 2)] },
  { ...dive(13, 381, { maxDepth: 48, bottomTimeMinutes: 28, averageDepth: 33 },
      { location: "Bonaire — Hilma Hooker", waterTemp: 27, bottomType: BottomType.Wreck },
      { gasType: BreathingGas.Trimix, o2Percent: 2_100, hePercent: 3_500, n2Percent: 4_400 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 18 }, DiveMode.SCUBA,
      DivePurpose.Photographic, SuitType.Dry, "Wide-angle pass, hull penetration to hold 2.") },
  dive(14, 442, { maxDepth: 35, bottomTimeMinutes: 47 }, { location: "Isla del Morro", currentKnots: 1 },
    { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 }),

  // ---- 2026: mixed ----
  { ...dive(15, 560, { maxDepth: 26, bottomTimeMinutes: 84, averageDepth: 20 },
      { location: "Lake Maracaibo — riser inspection", waterTemp: 25, bottomType: BottomType.Silt },
      { gasType: BreathingGas.Air, cylinderPressureIn: 2_400, cylinderPressureOut: 1_150, gasConsumed: 1_250, bailoutPressure: 2_070 },
      { decompType: DecompressionType.Standard, totalDecompTimeMinutes: 12 },
      DiveMode.SSA, DivePurpose.Inspection, SuitType.HotWater, "Riser clamp survey; visibility <1m."),
    attestations: [att("0x77Aa3E1c5D9b4F208e6C3a1D7f59B0E2c4A8d631", at(561), 4)] },
  { ...dive(16, 592, { maxDepth: 30, bottomTimeMinutes: 44, averageDepth: 19 },
      { location: "Taganga Reef", waterTemp: 28 },
      { gasType: BreathingGas.Nitrox, o2Percent: 3_200, n2Percent: 6_800 }, {},
      DiveMode.SCUBA, DivePurpose.Recreational, SuitType.Swim, "Back home at Taganga. Easy dive."),
    attestations: [att("0x1C6d8F2a94B0e5D7c3A1f8E6b2D49c07Ae5B3F62", at(593), 3)] },
];

export const DEMO_STATS_NOTE =
  "Demo logbook — synthetic data showing recreational and commercial records, a corrected (voided) entry, and buddy attestations.";
