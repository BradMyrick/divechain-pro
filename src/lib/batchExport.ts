// Export a logbook as Divechain Batch JSON - the public standard the import
// side parses (src/lib/batchImport.ts). The pair is round-trip tested: an
// exported file re-imports to drafts that regenerate identical headers (and,
// via the deterministic UDDF writer, identical content hashes).
//
// Field policy: omit anything whose value equals the import default, so
// hand-written files stay small and every exported field is meaningful.
//
// v2: the on-chain record is a thin header; rich fields come from the local
// profile draft when the exporter has it (the owner's own device does). A
// header-only export is still valid - it re-logs with fresh UDDF hashes.

import type { DiveDraft, DiveHeader } from "./types";import {
  bytes16ToStr,
  bytes1ToChar,
  tenthsToDepth,
  ymdToString,
} from "./contracts";
import {
  CANONICAL_UNITS,
  CANONICAL_MODE,
  CANONICAL_PURPOSE,
  CANONICAL_SUIT,
  CANONICAL_BOTTOM,
  CANONICAL_GAS,
  CANONICAL_DECOMP,
  type StandardDiveJson,
} from "./batchImport";

export interface BatchJsonFile {
  format: "divechain-batch-json";
  version: 2;
  exportedAt: string;
  dives: StandardDiveJson[];
}

const isoUtc = (unix: number): string | undefined =>
  unix > 0 ? new Date(unix * 1000).toISOString().replace(".000Z", "Z") : undefined;

export interface ExportableDive extends DiveHeader {
  draft?: DiveDraft;
}

/** Map one dive (header + optional local profile) to the public JSON standard. */
export function diveToStandardJson(d: ExportableDive): StandardDiveJson {
  const h = d;
  const units = Number(h.units);
  const draft = d.draft;

  const out: StandardDiveJson = {
    date: draft ? draft.diveDate : ymdToString(Number(h.diveDate)),
    units: CANONICAL_UNITS[units] ?? "imperial",
    mode: CANONICAL_MODE[Number(h.mode)] ?? "oc-recreational",
    maxDepth: tenthsToDepth(Number(h.maxDepth)),
    bottomTimeMinutes:
      Number(h.bottomTimeSeconds) > 0
        ? Math.round(Number(h.bottomTimeSeconds) / 60)
        : Math.round(Number(h.durationSeconds) / 60),
  };

  if (draft) {
    out.purpose = CANONICAL_PURPOSE[Number(draft.data.purpose)] ?? "other";
    out.suit = CANONICAL_SUIT[Number(draft.data.suit)] ?? "wet";
    if (Number(draft.data.averageDepth) > 0 && draft.data.averageDepth !== draft.data.maxDepth)
      out.averageDepth = Number(draft.data.averageDepth);

    const times: StandardDiveJson["times"] = {};
    if (Number(draft.data.leaveSurfaceTime) > 0) times.leftSurface = isoUtc(Number(draft.data.leaveSurfaceTime));
    if (Number(draft.data.leaveBottomTime) > 0) times.leftBottom = isoUtc(Number(draft.data.leaveBottomTime));
    if (Number(draft.data.reachSurfaceTime) > 0) times.reachedSurface = isoUtc(Number(draft.data.reachSurfaceTime));
    if (Object.keys(times).length > 0) out.times = times;

    const env = draft.env;
    const envJson: NonNullable<StandardDiveJson["environment"]> = {};
    if (String(env.location)) envJson.location = String(env.location);
    if (Number(env.coords.latitude) !== 0 || Number(env.coords.longitude) !== 0) {
      envJson.latitude = Number(env.coords.latitude);
      envJson.longitude = Number(env.coords.longitude);
    }
    if (Number(env.waterTemp) !== 0) envJson.waterTemp = Number(env.waterTemp);
    if (Number(env.airTemp) !== 0) envJson.airTemp = Number(env.airTemp);
    if (Number(env.currentKnots) !== 0) envJson.currentKnots = Number(env.currentKnots);
    if (Number(env.bottomType) !== 5) envJson.bottomType = CANONICAL_BOTTOM[Number(env.bottomType)] ?? "other";
    if (String(env.weatherConditions)) envJson.weather = String(env.weatherConditions);
    if (Object.keys(envJson).length > 0) out.environment = envJson;

    const gas = draft.gas;
    const gasJson: NonNullable<StandardDiveJson["gas"]> = {};
    if (Number(gas.gasType) !== 0) gasJson.type = CANONICAL_GAS[Number(gas.gasType)] ?? "air";
    if (Number(gas.o2Percent) !== 21) gasJson.o2Percent = Number(gas.o2Percent);
    if (Number(gas.hePercent) !== 0) gasJson.hePercent = Number(gas.hePercent);
    if (Number(gas.n2Percent) !== 79) gasJson.n2Percent = Number(gas.n2Percent);
    if (Number(gas.cylinderPressureIn) > 0) gasJson.startPressure = Number(gas.cylinderPressureIn);
    if (Number(gas.cylinderPressureOut) > 0) gasJson.endPressure = Number(gas.cylinderPressureOut);
    if (Number(gas.gasConsumed) > 0) gasJson.gasConsumed = Number(gas.gasConsumed);
    if (Number(gas.bailoutPressure) > 0) gasJson.bailoutPressure = Number(gas.bailoutPressure);
    if (Object.keys(gasJson).length > 0) out.gas = gasJson;

    if (String(draft.remarks)) out.remarks = String(draft.remarks);
  } else {
    // Header-only: carry what the chain knows. Total deco is not on the v2
    // header (duration - bottom time when both are recorded is the closest
    // honest figure), so deco comes out only via the schedule/groups.
    if (Number(h.bottomTimeSeconds) > 0 && Number(h.durationSeconds) > Number(h.bottomTimeSeconds)) {
      const deco: NonNullable<StandardDiveJson["deco"]> = {};
      deco.totalMinutes = Math.round((Number(h.durationSeconds) - Number(h.bottomTimeSeconds)) / 60);
      out.deco = deco;
    }
  }

  if (Number(h.surfaceIntervalSeconds) > 0)
    out.surfaceIntervalMinutes = Math.round(Number(h.surfaceIntervalSeconds) / 60);

  const schedule = bytes16ToStr(h.tableSchedule);
  const rg = bytes1ToChar(h.repetitiveGroup);
  const rgAfter = bytes1ToChar(h.repetitiveGroupAfterSI);
  if (schedule || rg || rgAfter || (draft && Number(draft.decomp.totalDecompTimeMinutes) > 0) ||
      (draft && Number(draft.decomp.maxDepthAttained) > 0 && Number(draft.decomp.maxDepthAttained) !== Number(draft.data.maxDepth))) {
    const deco: NonNullable<StandardDiveJson["deco"]> = out.deco ?? {};
    if (draft && Number(draft.decomp.decompType) !== 0)
      deco.type = CANONICAL_DECOMP[Number(draft.decomp.decompType)] ?? "standard";
    if (draft && Number(draft.decomp.totalDecompTimeMinutes) > 0)
      deco.totalMinutes = Number(draft.decomp.totalDecompTimeMinutes);
    if (draft && Number(draft.decomp.maxDepthAttained) > 0 && Number(draft.decomp.maxDepthAttained) !== Number(draft.data.maxDepth))
      deco.maxDepthAttained = Number(draft.decomp.maxDepthAttained);
    if (schedule) deco.tableSchedule = schedule;
    if (rg) deco.repetitiveGroup = rg;
    if (rgAfter) deco.newRepetitiveGroup = rgAfter;
    out.deco = deco;
  }

  return out;
}

/** Export a whole logbook (voided dives included - the on-chain history is
 *  the history; the import side marks them as duplicates). */
export function divesToBatchJson(dives: readonly ExportableDive[]): BatchJsonFile {
  return {
    format: "divechain-batch-json",
    version: 2,
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
