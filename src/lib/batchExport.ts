// Export a logbook as Divechain Batch JSON — the public standard the import
// side parses (src/lib/batchImport.ts). The pair is round-trip tested: an
// exported file re-imports to the exact same on-chain payloads.
//
// Field policy: omit anything whose value equals the import default, so
// hand-written files stay small and every exported field is meaningful.

import type { DiveInput } from "./types";
import { ZERO_BYTES1 } from "./types";
import {
  CANONICAL_UNITS,
  CANONICAL_MODE,
  CANONICAL_PURPOSE,
  CANONICAL_SUIT,
  CANONICAL_BOTTOM,
  CANONICAL_GAS,
  CANONICAL_DECOMP,
  bytes32ToStr,
  type StandardDiveJson,
} from "./batchImport";

export interface BatchJsonFile {
  format: "divechain-batch-json";
  version: 1;
  exportedAt: string;
  dives: StandardDiveJson[];
}

const isoUtc = (unix: number): string | undefined =>
  unix > 0 ? new Date(unix * 1000).toISOString().replace(".000Z", "Z") : undefined;

/** UTC calendar day of a noon-UTC diveDate, as YYYY-MM-DD. */
function dayOf(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

const bytes1ToChar = (hex: `0x${string}`): string | undefined => {
  if (!hex || hex === ZERO_BYTES1) return undefined;
  const byte = parseInt(hex.slice(2, 4), 16);
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : undefined;
};

/** Map one on-chain dive to the public JSON standard. */
export function diveToStandardJson(d: DiveInput): StandardDiveJson {
  const units = Number(d.units);
  const schedule = bytes32ToStr(d.decomp.tableSchedule);

  const out: StandardDiveJson = {
    date: dayOf(Number(d.diveDate)),
    units: CANONICAL_UNITS[units] ?? "imperial",
    mode: CANONICAL_MODE[Number(d.data.mode)] ?? "scuba",
    purpose: CANONICAL_PURPOSE[Number(d.data.purpose)] ?? "other",
    suit: CANONICAL_SUIT[Number(d.data.suit)] ?? "wet",
    maxDepth: Number(d.data.maxDepth),
    bottomTimeMinutes: Number(d.data.bottomTimeMinutes),
  };

  if (Number(d.data.averageDepth) > 0 && d.data.averageDepth !== d.data.maxDepth)
    out.averageDepth = Number(d.data.averageDepth);

  const times: StandardDiveJson["times"] = {};
  if (d.data.leaveSurfaceTime > 0) times.leftSurface = isoUtc(Number(d.data.leaveSurfaceTime));
  if (d.data.leaveBottomTime > 0) times.leftBottom = isoUtc(Number(d.data.leaveBottomTime));
  if (d.data.reachSurfaceTime > 0) times.reachedSurface = isoUtc(Number(d.data.reachSurfaceTime));
  if (Object.keys(times).length > 0) out.times = times;

  if (d.decomp.surfaceIntervalMinutes > 0)
    out.surfaceIntervalMinutes = Number(d.decomp.surfaceIntervalMinutes);

  const gas = d.gas;
  if (Number(gas.gasType) !== 0 || Number(gas.o2Percent) !== 21 || Number(gas.hePercent) !== 0 ||
      Number(gas.n2Percent) !== 79 || Number(gas.cylinderPressureIn) > 0 ||
      Number(gas.cylinderPressureOut) > 0 || Number(gas.gasConsumed) > 0 || Number(gas.bailoutPressure) > 0) {
    const gasJson: NonNullable<StandardDiveJson["gas"]> = {};
    if (Number(gas.gasType) !== 0) gasJson.type = CANONICAL_GAS[Number(gas.gasType)] ?? "air";
    if (Number(gas.o2Percent) !== 21) gasJson.o2Percent = Number(gas.o2Percent);
    if (Number(gas.hePercent) !== 0) gasJson.hePercent = Number(gas.hePercent);
    if (Number(gas.n2Percent) !== 79) gasJson.n2Percent = Number(gas.n2Percent);
    if (Number(gas.cylinderPressureIn) > 0) gasJson.startPressure = Number(gas.cylinderPressureIn);
    if (Number(gas.cylinderPressureOut) > 0) gasJson.endPressure = Number(gas.cylinderPressureOut);
    if (Number(gas.gasConsumed) > 0) gasJson.gasConsumed = Number(gas.gasConsumed);
    if (Number(gas.bailoutPressure) > 0) gasJson.bailoutPressure = Number(gas.bailoutPressure);
    out.gas = gasJson;
  }

  if (Number(d.decomp.decompType) !== 0 || Number(d.decomp.totalDecompTimeMinutes) > 0 ||
      schedule || d.decomp.repetitiveGroup !== ZERO_BYTES1 || d.decomp.newRepetitiveGroup !== ZERO_BYTES1 ||
      d.decomp.maxDepthAttained !== d.data.maxDepth) {
    const deco: NonNullable<StandardDiveJson["deco"]> = {};
    if (Number(d.decomp.decompType) !== 0) deco.type = CANONICAL_DECOMP[Number(d.decomp.decompType)] ?? "standard";
    if (Number(d.decomp.totalDecompTimeMinutes) > 0) deco.totalMinutes = Number(d.decomp.totalDecompTimeMinutes);
    if (schedule) deco.tableSchedule = schedule;
    if (d.decomp.maxDepthAttained !== d.data.maxDepth) deco.maxDepthAttained = Number(d.decomp.maxDepthAttained);
    const rg = bytes1ToChar(d.decomp.repetitiveGroup);
    if (rg) deco.repetitiveGroup = rg;
    const nrg = bytes1ToChar(d.decomp.newRepetitiveGroup);
    if (nrg) deco.newRepetitiveGroup = nrg;
    out.deco = deco;
  }

  const env = d.env;
  if (String(env.location) || String(env.weatherConditions) || Number(env.airTemp) !== 0 ||
      Number(env.waterTemp) !== 0 || Number(env.currentKnots) !== 0 ||
      Number(env.coords.latitude) !== 0 || Number(env.coords.longitude) !== 0 || Number(env.bottomType) !== 5) {
    const envJson: NonNullable<StandardDiveJson["environment"]> = {};
    if (String(env.location)) envJson.location = String(env.location);
    if (Number(env.coords.latitude) !== 0 || Number(env.coords.longitude) !== 0) {
      envJson.latitude = Number(env.coords.latitude) / 1e6;
      envJson.longitude = Number(env.coords.longitude) / 1e6;
    }
    if (Number(env.waterTemp) !== 0) envJson.waterTemp = Number(env.waterTemp);
    if (Number(env.airTemp) !== 0) envJson.airTemp = Number(env.airTemp);
    if (Number(env.currentKnots) !== 0) envJson.currentKnots = Number(env.currentKnots);
    if (Number(env.bottomType) !== 5) envJson.bottomType = CANONICAL_BOTTOM[Number(env.bottomType)] ?? "other";
    if (String(env.weatherConditions)) envJson.weather = String(env.weatherConditions);
    out.environment = envJson;
  }

  if (String(d.remarks)) out.remarks = String(d.remarks);

  return out;
}

/** Export a whole logbook (voided dives included — the on-chain history is
 *  the history; the import side marks them as duplicates). */
export function divesToBatchJson(dives: readonly DiveInput[]): BatchJsonFile {
  return {
    format: "divechain-batch-json",
    version: 1,
    exportedAt: new Date().toISOString(),
    dives: dives.map((d) => diveToStandardJson(d)),
  };
}
/** Serialize + download a batch JSON file in the browser. */
export function downloadBatchJson(file: BatchJsonFile, fileName: string): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
