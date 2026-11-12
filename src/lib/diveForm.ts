// Pure state + conversions for the shared dive-entry form
// (src/components/DiveForm.tsx). Kept out of the component file so both
// /log-dive and the batch import editor encode dives identically - and so
// the conversions are unit-testable.
//
// v2 encoding rules (one-way consistency with every dive already on-chain):
//   * the on-chain record is a thin header: dates are uint32 YYYYMMDD, depth
//     is tenths of FSW/MSW per the units system, gas is basis points, the
//     table schedule is bytes16, the coarse location is a bytes4 geohash;
//   * the rich record lives in the deterministic UDDF profile whose SHA-256
//     becomes the required `contentHash` (see src/lib/uddf.ts);
//   * `startTime` defaults to noon UTC of the dive day when no clock time is
//     recorded, so the header's date check always holds;
//   * total duration is surface-to-surface: from the wall clock when present,
//     otherwise bottom time plus deco.

import {
  UnitSystem,
  DiveMode,
  charToBytes1,
  depthToTenths,
  percentToBps,
  parseTableSchedule,
  strToBytes16,
  stringToYmd,
  ymdOfUnix,
} from "./contracts";
import { coarseGeohashBytes } from "./geohash";
import { uddfFromDraft, sha256Hex, draftTiming } from "./uddf";
import type { DiveDraft, DiveInput } from "./types";
import { ZERO_BYTES16, ZERO_BYTES4 } from "./types";

export interface DiveFormState {
  diveDate: string; // YYYY-MM-DD (local calendar day the diver means)
  units: UnitSystem;
  leaveSurface: string; // datetime-local, optional
  leaveBottom: string;
  reachSurface: string;
  maxDepth: number;
  averageDepth: number;
  bottomTimeMinutes: number;
  mode: DiveMode;
  purpose: number;
  suit: number;

  location: string;
  lat: string; // degrees, string so partial typing is legal
  lon: string;
  waterTemp: number;
  airTemp: number;
  currentKnots: number;
  bottomType: number;
  weatherConditions: string;

  decompType: number;
  totalDecompTime: number;
  tableSchedule: string; // "<TOKEN>[ <schedule>]" e.g. "USN 60/40"; empty -> bytes16(0)
  gasType: number;
  o2Percent: number;
  hePercent: number;
  cylIn: number;
  cylOut: number;
  remarks: string;
}

export const todayDateStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Defaults matching the /log-dive page's fresh form. */
export function emptyDiveFormState(): DiveFormState {
  return {
    diveDate: todayDateStr(),
    units: UnitSystem.Metric,
    leaveSurface: "",
    leaveBottom: "",
    reachSurface: "",
    maxDepth: 30,
    averageDepth: 15,
    bottomTimeMinutes: 45,
    mode: DiveMode.OCRecreational,
    purpose: 11, // Recreational (off-chain vocabulary)
    suit: 0, // Wet
    location: "",
    lat: "",
    lon: "",
    waterTemp: 20,
    airTemp: 25,
    currentKnots: 0,
    bottomType: 5, // Other
    weatherConditions: "",
    decompType: 0,
    totalDecompTime: 0,
    tableSchedule: "",
    gasType: 0,
    o2Percent: 21,
    hePercent: 0,
    cylIn: 0,
    cylOut: 0,
    remarks: "",
  };
}

const toUnix = (dt: string): number => (dt ? Math.floor(new Date(dt).getTime() / 1000) : 0);

/** datetime-local input value for a unix timestamp (local clock), "" when 0. */
export function epochToLocalInput(unix: number): string {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The rich draft: everything the form collects. Never goes on-chain; it is
 *  serialized to UDDF and stored/exported instead. */
export function diveFormToDraft(s: DiveFormState): DiveDraft {
  return {
    diveDate: s.diveDate,
    units: s.units,
    data: {
      leaveSurfaceTime: toUnix(s.leaveSurface),
      leaveBottomTime: toUnix(s.leaveBottom),
      reachSurfaceTime: toUnix(s.reachSurface),
      bottomTimeMinutes: s.bottomTimeMinutes,
      maxDepth: s.maxDepth,
      averageDepth: s.averageDepth,
      mode: s.mode,
      purpose: s.purpose,
      suit: s.suit,
    },
    env: {
      airTemp: s.airTemp,
      waterTemp: s.waterTemp,
      currentKnots: s.currentKnots,
      bottomType: s.bottomType,
      coords: { latitude: Number(s.lat) || 0, longitude: Number(s.lon) || 0 },
      location: s.location,
      weatherConditions: s.weatherConditions,
    },
    decomp: {
      decompType: s.decompType,
      totalDecompTimeMinutes: s.totalDecompTime,
      maxDepthAttained: s.maxDepth,
      tableSchedule: s.tableSchedule.trim(),
      repetitiveGroup: "",
      surfaceIntervalMinutes: 0,
      newRepetitiveGroup: "",
    },
    gas: {
      gasType: s.gasType,
      o2Percent: s.o2Percent,
      hePercent: s.hePercent,
      n2Percent: Math.max(0, 100 - s.o2Percent - s.hePercent),
      cylinderPressureIn: s.cylIn,
      cylinderPressureOut: s.cylOut,
      gasConsumed: Math.max(0, s.cylIn - s.cylOut),
      bailoutPressure: 0,
    },
    remarks: s.remarks,
  };
}

/** Seed form state from a draft (import editor). Timestamps keep their
 *  instants; the dive date reads back as its UTC calendar day. */
export function draftToDiveForm(d: DiveDraft): DiveFormState {
  const base = emptyDiveFormState();
  return {
    ...base,
    diveDate: d.diveDate || todayDateStr(),
    units: Number(d.units) as UnitSystem,
    leaveSurface: epochToLocalInput(Number(d.data.leaveSurfaceTime)),
    leaveBottom: epochToLocalInput(Number(d.data.leaveBottomTime)),
    reachSurface: epochToLocalInput(Number(d.data.reachSurfaceTime)),
    maxDepth: Number(d.data.maxDepth) || 0,
    averageDepth: Number(d.data.averageDepth) || 0,
    bottomTimeMinutes: Number(d.data.bottomTimeMinutes) || 0,
    mode: Number(d.data.mode) as DiveMode,
    purpose: Number(d.data.purpose) || 0,
    suit: Number(d.data.suit) || 0,
    location: String(d.env.location ?? ""),
    lat: d.env.coords?.latitude ? String(d.env.coords.latitude) : "",
    lon: d.env.coords?.longitude ? String(d.env.coords.longitude) : "",
    waterTemp: Number(d.env.waterTemp) || 0,
    airTemp: Number(d.env.airTemp) || 0,
    currentKnots: Number(d.env.currentKnots) || 0,
    bottomType: Number(d.env.bottomType) || 0,
    weatherConditions: String(d.env.weatherConditions ?? ""),
    decompType: Number(d.decomp.decompType) || 0,
    totalDecompTime: Number(d.decomp.totalDecompTimeMinutes) || 0,
    tableSchedule: String(d.decomp.tableSchedule ?? ""),
    gasType: Number(d.gas.gasType) || 0,
    o2Percent: Number(d.gas.o2Percent) || 0,
    hePercent: Number(d.gas.hePercent) || 0,
    cylIn: Number(d.gas.cylinderPressureIn) || 0,
    cylOut: Number(d.gas.cylinderPressureOut) || 0,
    remarks: String(d.remarks ?? ""),
  };
}

/** Encode the v2 on-chain header from a draft (no hashing here - that needs
 *  the UDDF bytes, see `prepareDiveInput`). */
export function draftToHeader(d: DiveDraft): Omit<DiveInput, "contentHash"> & { contentHash: `0x${string}` } {
  const { startTime, durationSeconds, bottomTimeSeconds } = draftTiming(d);
  // diveDate follows the UTC day of startTime when a clock exists, else the
  // date the diver picked (the contract requires they match).
  const ymd = startTime > 0 ? ymdOfUnix(startTime) : stringToYmd(d.diveDate);
  const schedule = parseTableSchedule(String(d.decomp.tableSchedule ?? ""));
  const lat = Number(d.env.coords?.latitude) || 0;
  const lon = Number(d.env.coords?.longitude) || 0;
  const hasGas = (Number(d.gas.o2Percent) || 0) > 0 || (Number(d.gas.hePercent) || 0) > 0;
  const rg = String(d.decomp.repetitiveGroup ?? "").trim();
  const rgAfter = String(d.decomp.newRepetitiveGroup ?? "").trim();
  const siSec = Math.round(Number(d.decomp.surfaceIntervalMinutes) * 60);

  return {
    diveDate: ymd,
    startTime,
    maxDepth: depthToTenths(Number(d.data.maxDepth) || 0),
    durationSeconds,
    bottomTimeSeconds,
    mode: Number(d.data.mode),
    units: Number(d.units),
    o2Bps: hasGas ? percentToBps(Number(d.gas.o2Percent) || 0) : 0,
    heBps: hasGas ? percentToBps(Number(d.gas.hePercent) || 0) : 0,
    tableSchedule: schedule ? strToBytes16(schedule.token + (schedule.schedule ? " " + schedule.schedule : "")) : ZERO_BYTES16,
    surfaceIntervalSeconds: siSec,
    repetitiveGroup: charToBytes1(rg),
    repetitiveGroupAfterSI: charToBytes1(rgAfter),
    coarseGeohash: lat !== 0 || lon !== 0 ? coarseGeohashBytes(lat, lon) : ZERO_BYTES4,
    // placeholder; prepareDiveInput fills it with the UDDF SHA-256
    contentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    profileURI: "",
  };
}

export interface PreparedDive {
  input: DiveInput;
  /** Exact UDDF bytes the contentHash commits to. */
  uddf: string;
  draft: DiveDraft;
}

/** Full v2 payload: deterministic UDDF from the draft, SHA-256 contentHash,
 *  and the packed header. Pure apart from the digest computation; the caller
 *  owns persistence (profileVault.saveProfile) and any publishing. */
export async function prepareDiveInput(draft: DiveDraft): Promise<PreparedDive> {
  const uddf = uddfFromDraft(draft);
  const contentHash = await sha256Hex(uddf);
  const header = draftToHeader(draft);
  return { input: { ...header, contentHash }, uddf, draft };
}

/** The leave-surface clock must fall on the dive's calendar day. */
export function startDayMismatch(s: DiveFormState): boolean {
  return Boolean(s.leaveSurface) && !s.leaveSurface.startsWith(s.diveDate);
}
