// Pure state + conversions for the shared dive-entry form
// (src/components/DiveForm.tsx). Kept out of the component file so both
// /log-dive and the batch import editor encode dives identically — and so
// the conversions are unit-testable.
//
// Encoding rules (one-way consistency with every dive already on-chain):
//   * date-only fields (diveDate) are stored at NOON UTC so every timezone
//     renders the same calendar day
//   * in/out times are optional datetime-local values, stored as unix seconds
//   * n2 % is derived (100 - O2 - He); gas consumed is derived (in - out)

import {
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  BreathingGas,
  DecompressionType,
} from "./contracts";
import type { DiveInput } from "./types";
import { ZERO_BYTES32, ZERO_BYTES1 } from "./types";
import { strToBytes32, bytes32ToStr } from "./batchImport";

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
  purpose: DivePurpose;
  suit: SuitType;

  location: string;
  lat: string; // microdegrees, string so partial typing is legal
  lon: string;
  waterTemp: number;
  airTemp: number;
  currentKnots: number;
  bottomType: BottomType;
  weatherConditions: string;

  decompType: DecompressionType;
  totalDecompTime: number;
  tableSchedule: string; // e.g. "60/120"; empty -> zero bytes32
  gasType: BreathingGas;
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
    mode: DiveMode.SCUBA,
    purpose: DivePurpose.Recreational,
    suit: SuitType.Wet,
    location: "",
    lat: "",
    lon: "",
    waterTemp: 20,
    airTemp: 25,
    currentKnots: 0,
    bottomType: BottomType.Sand,
    weatherConditions: "",
    decompType: DecompressionType.NoneDecomp,
    totalDecompTime: 0,
    tableSchedule: "",
    gasType: BreathingGas.Air,
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

/** The on-chain payload. Identical encoding to the /log-dive page pre-refactor:
 *  date-only fields at noon UTC, n2 derived, gas consumed derived. */
export function diveFormToInput(s: DiveFormState): DiveInput {
  // Date-only field: stored as noon UTC so every timezone renders the same calendar day
  const diveDateUnix = Math.floor(Date.parse(`${s.diveDate}T12:00:00Z`) / 1000);
  return {
    diveDate: diveDateUnix,
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
      tableSchedule: s.tableSchedule.trim() ? strToBytes32(s.tableSchedule.trim()) : ZERO_BYTES32,
      repetitiveGroup: ZERO_BYTES1,
      surfaceIntervalMinutes: 0,
      newRepetitiveGroup: ZERO_BYTES1,
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

/** Seed form state from an on-chain payload (import editor). Timestamps keep
 *  their instants; the dive date reads back as its UTC calendar day. */
export function diveInputToForm(input: DiveInput): DiveFormState {
  const base = emptyDiveFormState();
  const day = input.diveDate
    ? new Date(input.diveDate * 1000).toISOString().slice(0, 10)
    : todayDateStr();
  return {
    ...base,
    diveDate: day,
    units: Number(input.units) as UnitSystem,
    leaveSurface: epochToLocalInput(input.data.leaveSurfaceTime),
    leaveBottom: epochToLocalInput(input.data.leaveBottomTime),
    reachSurface: epochToLocalInput(input.data.reachSurfaceTime),
    maxDepth: Number(input.data.maxDepth) || 0,
    averageDepth: Number(input.data.averageDepth) || 0,
    bottomTimeMinutes: Number(input.data.bottomTimeMinutes) || 0,
    mode: Number(input.data.mode) as DiveMode,
    purpose: Number(input.data.purpose) as DivePurpose,
    suit: Number(input.data.suit) as SuitType,
    location: String(input.env.location ?? ""),
    lat: input.env.coords?.latitude ? String(input.env.coords.latitude) : "",
    lon: input.env.coords?.longitude ? String(input.env.coords.longitude) : "",
    waterTemp: Number(input.env.waterTemp) || 0,
    airTemp: Number(input.env.airTemp) || 0,
    currentKnots: Number(input.env.currentKnots) || 0,
    bottomType: Number(input.env.bottomType) as BottomType,
    weatherConditions: String(input.env.weatherConditions ?? ""),
    decompType: Number(input.decomp.decompType) as DecompressionType,
    totalDecompTime: Number(input.decomp.totalDecompTimeMinutes) || 0,
    tableSchedule: bytes32ToStr(input.decomp.tableSchedule),
    gasType: Number(input.gas.gasType) as BreathingGas,
    o2Percent: Number(input.gas.o2Percent) || 0,
    hePercent: Number(input.gas.hePercent) || 0,
    cylIn: Number(input.gas.cylinderPressureIn) || 0,
    cylOut: Number(input.gas.cylinderPressureOut) || 0,
    remarks: String(input.remarks ?? ""),
  };
}

/** The leave-surface clock must fall on the dive's calendar day. */
export function startDayMismatch(s: DiveFormState): boolean {
  return Boolean(s.leaveSurface) && !s.leaveSurface.startsWith(s.diveDate);
}
