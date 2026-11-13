// Batch dive import: client-side parsing, validation, dedup and chunking.
//
// Everything here is pure and runs in the browser - no dive data leaves the
// page until the user signs a transaction. Parsers are a pluggable registry
// (SPEC-6: client-side importers chunk across transactions rather than raise
// the contract's MAX_BATCH_SIZE cap; PAPER-IX: values from any file are
// untrusted until validated against the contract's own guards).
//
// v2: parsed rows carry the rich DiveDraft. The thin on-chain header (and the
// required UDDF contentHash) is derived at send time via prepareDiveInput, so
// edits in the reviewer never invalidate an earlier hash.
//
// Supported sources, tried in order:
//   1. "divechain-json"   - the Divechain Batch JSON standard (see README)
//   2. "evidence-core"    - commercial_dive_logs repair format; mapping is a
//                           1:1 port of divechain-batch-logger/scripts/gen_batches.py
//   3. "heuristic-json"   - best-effort field sniffing on any valid JSON;
//                           rows that cannot be mapped confidently come back
//                           as invalid so a human completes them in the editor

import {
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  BreathingGas,
  DecompressionType,
  UNIT_SYSTEM_LABELS,
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  SUIT_TYPE_LABELS,
  BOTTOM_TYPE_LABELS,
  BREATHING_GAS_LABELS,
  DECOMP_TYPE_LABELS,
  parseTableSchedule,
  depthToTenths,
  ymdOfUnix,
  stringToYmd,
} from "./contracts";
import type { DiveDraft } from "./types";
import { noonUtc, draftTiming } from "./uddf";

// ---------------------------------------------------------------------------
// Canonical name <-> enum lookups (the public JSON uses names, never numbers)
// ---------------------------------------------------------------------------

/** lowercase, strip everything that is not a letter or digit */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function buildLookup(
  enumObj: Record<string, number>,
  labels: Record<number, string>,
  extraAliases: Record<string, number> = {},
): Map<string, number> {
  const map = new Map<string, number>();
  for (const extra of Object.entries(extraAliases)) {
    for (const alias of extra[0].split("|")) map.set(norm(alias), extra[1]);
  }
  for (const [key, value] of Object.entries(enumObj)) {
    if (typeof value !== "number") continue;
    map.set(norm(key), value);
    const label = labels[value];
    if (label) map.set(norm(label), value);
  }
  return map;
}

const LOOKUP_UNITS = buildLookup(UnitSystem, UNIT_SYSTEM_LABELS, { imperial: 0, metric: 1 });
// v1 aliases stay importable: scuba -> OC recreational, ssa -> surface supplied.
const LOOKUP_MODE = buildLookup(DiveMode, DIVE_MODE_LABELS, {
  "scuba|open_circuit|oc": DiveMode.OCRecreational,
  "ssa|surface_supplied": DiveMode.SurfaceSupplied,
  "oc-rec|oc-recr": DiveMode.OCRecreational,
  "oc-tech": DiveMode.OCTechnical,
});
const LOOKUP_PURPOSE = buildLookup(DivePurpose, DIVE_PURPOSE_LABELS, { work: 12 });
const LOOKUP_SUIT = buildLookup(SuitType, SUIT_TYPE_LABELS, { "hot-water": 2, hotwater: 2, hot_water: 2 });
const LOOKUP_BOTTOM = buildLookup(BottomType, BOTTOM_TYPE_LABELS, { seabed: 5 });
const LOOKUP_GAS = buildLookup(BreathingGas, BREATHING_GAS_LABELS, { o2: 4, ean: 1 });
const LOOKUP_DECOMP = buildLookup(DecompressionType, DECOMP_TYPE_LABELS, {
  none: 0,
  standard: 1,
  "surface-decomp-o2": 2,
  "surface-decomp-air": 3,
  saturation: 4,
  repetitive: 5,
  "exceptional-exposure": 6,
});

function enumFromName(lookup: Map<string, number>, raw: unknown, fallback: number, warning?: string): { value: number; warning?: string } {
  if (raw === undefined || raw === null || raw === "") return { value: fallback };
  if (typeof raw === "number" && lookupContains(lookup, raw)) return { value: raw };
  const hit = lookup.get(norm(String(raw)));
  if (hit !== undefined) return { value: hit };
  return {
    value: fallback,
    warning: warning ?? `Unrecognized value "${String(raw)}" - using the fallback for now; fix it before logging`,
  };
}

function lookupContains(lookup: Map<string, number>, value: number): boolean {
  for (const v of lookup.values()) if (v === value) return true;
  return false;
}

/** Reverse map: enum value -> canonical public name (for export & display). */
export const CANONICAL_UNITS = ["imperial", "metric"];
export const CANONICAL_MODE = [
  "oc-recreational",
  "oc-technical",
  "ccr",
  "scr",
  "freedive",
  "surface-supplied",
  "saturation",
];
export const CANONICAL_PURPOSE = [
  "training", "inspection", "repair", "search", "salvage", "recovery",
  "construction", "research", "eod", "security", "photographic", "recreational", "other",
];
export const CANONICAL_SUIT = ["wet", "dry", "hot-water", "swim"];
export const CANONICAL_BOTTOM = ["sand", "coral", "rock", "wreck", "silt", "other"];
export const CANONICAL_GAS = ["air", "nitrox", "heliox", "trimix", "oxygen", "mixed"];
export const CANONICAL_DECOMP = [
  "none", "standard", "surface-decomp-o2", "surface-decomp-air",
  "saturation", "repetitive", "exceptional-exposure",
];

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Unix epoch seconds for a UTC calendar date at 12:00 - the site convention:
 *  a date-only record stores noon UTC, which also serves as the default v2
 *  startTime so the header's date check always holds. */
export { noonUtc };

/** Unix epoch seconds for a UTC calendar date + "HH:mm[:ss]" clock. */
function utcClock(dateStr: string, clock: string): number {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr).trim());
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(clock).trim());
  if (!day || !t) return 0;
  return Math.floor(Date.UTC(+day[1], +day[2] - 1, +day[3], +t[1], +t[2], +(t[3] ?? 0)) / 1000);
}

/** A time value that is either "HH:mm" (interpreted on the UTC day) or a full
 *  ISO-8601 string (any offset). Returns 0 when unparseable. */
function parseTimePoint(dateStr: string, value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return utcClock(dateStr, s);
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

const toInt = (v: unknown): number => {
  if (typeof v === "number") return Math.trunc(v);
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

const toNum = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/** Leading digits of a string like "57 ft" -> 57 (mirrors gen_batches.depth). */
function leadingInt(raw: unknown): number {
  const m = /^(\d+(?:\.\d+)?)/.exec(String(raw ?? "").trim());
  return m ? Math.trunc(parseFloat(m[1])) : NaN;
}

// ---------------------------------------------------------------------------
// Parse result types
// ---------------------------------------------------------------------------

export type ImportFormat = "divechain-json" | "evidence-core" | "heuristic-json";

export interface ParsedRow {
  /** Stable id within this import (draft persistence + React keys). */
  key: string;
  /** Index in the uploaded file (1-based, human-facing). */
  sourceIndex: number;
  /** The rich record this row will commit (header + UDDF derive from it). */
  input: DiveDraft;
  /** Non-blocking notes from mapping (shown in the editor, never silently dropped). */
  warnings: string[];
}

export interface ParseResult {
  format: ImportFormat;
  formatLabel: string;
  rows: ParsedRow[];
  /** File-level notes (e.g. assumed units in heuristic mode). */
  notes: string[];
}

export class ImportError extends Error {}

let rowSeq = 0;
const nextRowKey = (): string => `r${Date.now().toString(36)}-${rowSeq++}`;

// ---------------------------------------------------------------------------
// 1. Divechain Batch JSON (the public standard - see README)
// ---------------------------------------------------------------------------

export interface StandardDiveJson {
  date?: string;
  units?: string | number;
  mode?: string | number;
  purpose?: string | number;
  suit?: string | number;
  maxDepth?: number | string;
  averageDepth?: number | string;
  bottomTimeMinutes?: number | string;
  times?: { leftSurface?: string; leftBottom?: string; reachedSurface?: string };
  surfaceIntervalMinutes?: number | string;
  gas?: {
    type?: string | number;
    o2Percent?: number | string;
    hePercent?: number | string;
    n2Percent?: number | string;
    startPressure?: number | string;
    endPressure?: number | string;
    gasConsumed?: number | string;
    bailoutPressure?: number | string;
  };
  deco?: {
    type?: string | number;
    totalMinutes?: number | string;
    tableSchedule?: string;
    maxDepthAttained?: number | string;
    repetitiveGroup?: string;
    newRepetitiveGroup?: string;
  };
  environment?: {
    location?: string;
    site?: string;
    latitude?: number | string;
    longitude?: number | string;
    waterTemp?: number | string;
    airTemp?: number | string;
    currentKnots?: number | string;
    bottomType?: string | number;
    weather?: string;
  };
  remarks?: string;
  notes?: string;
}

function mapStandardDive(raw: unknown, index: number): ParsedRow {
  const d = (raw ?? {}) as StandardDiveJson;
  const warnings: string[] = [];

  const date = d.date ?? ((d as Record<string, unknown>).diveDate as string | undefined);
  const diveDate = date ? String(date).slice(0, 10) : "";

  const unitsR = enumFromName(LOOKUP_UNITS, d.units, UnitSystem.Imperial);
  if (unitsR.warning) warnings.push(`units: ${unitsR.warning}`);
  const modeR = enumFromName(LOOKUP_MODE, d.mode, DiveMode.OCRecreational);
  if (modeR.warning) warnings.push(`mode: ${modeR.warning}`);
  const purposeR = enumFromName(LOOKUP_PURPOSE, d.purpose, DivePurpose.Recreational);
  if (purposeR.warning) warnings.push(`purpose: ${purposeR.warning}`);
  const suitR = enumFromName(LOOKUP_SUIT, d.suit, SuitType.Wet);
  if (suitR.warning) warnings.push(`suit: ${suitR.warning}`);

  const maxDepth = d.maxDepth !== undefined ? toInt(d.maxDepth) : NaN;
  const averageDepth =
    d.averageDepth !== undefined ? toInt(d.averageDepth) : Number.isFinite(maxDepth) ? maxDepth : 0;
  const bottomTimeMinutes = d.bottomTimeMinutes !== undefined ? toInt(d.bottomTimeMinutes) : NaN;

  const t = d.times ?? {};
  const leaveSurfaceTime = parseTimePoint(String(date ?? ""), t.leftSurface);
  const leaveBottomTime = parseTimePoint(String(date ?? ""), t.leftBottom);
  const reachSurfaceTime = parseTimePoint(String(date ?? ""), t.reachedSurface);

  const g = d.gas ?? {};
  const gasR = enumFromName(LOOKUP_GAS, g.type, BreathingGas.Air);
  if (gasR.warning) warnings.push(`gas: ${gasR.warning}`);
  const o2Percent = g.o2Percent !== undefined ? toInt(g.o2Percent) : 21;
  const hePercent = g.hePercent !== undefined ? toInt(g.hePercent) : 0;
  const n2Percent = g.n2Percent !== undefined ? toInt(g.n2Percent) : Math.max(0, 100 - o2Percent - hePercent);
  const cylIn = g.startPressure !== undefined ? toInt(g.startPressure) : 0;
  const cylOut = g.endPressure !== undefined ? toInt(g.endPressure) : 0;
  const gasConsumed =
    g.gasConsumed !== undefined ? toInt(g.gasConsumed) : Math.max(0, cylIn - cylOut);

  const dec = d.deco ?? {};
  const decompR = enumFromName(LOOKUP_DECOMP, dec.type, DecompressionType.NoneDecomp);
  if (decompR.warning) warnings.push(`deco: ${decompR.warning}`);
  const schedule = dec.tableSchedule !== undefined ? String(dec.tableSchedule) : "";
  const env = d.environment ?? {};
  const bottomR = enumFromName(LOOKUP_BOTTOM, env.bottomType, BottomType.Other);
  if (bottomR.warning) warnings.push(`bottom type: ${bottomR.warning}`);

  const groupOf = (v: unknown): string => {
    const s = v === undefined || v === null ? "" : String(v).trim().toUpperCase();
    return /^[A-Z]$/.test(s) ? s : "";
  };

  const latDeg = env.latitude !== undefined ? toNum(env.latitude) : 0;
  const lonDeg = env.longitude !== undefined ? toNum(env.longitude) : 0;

  const input: DiveDraft = {
    diveDate,
    units: unitsR.value,
    data: {
      leaveSurfaceTime,
      leaveBottomTime,
      reachSurfaceTime,
      bottomTimeMinutes,
      maxDepth,
      averageDepth,
      mode: modeR.value,
      purpose: purposeR.value,
      suit: suitR.value,
    },
    env: {
      airTemp: env.airTemp !== undefined ? toInt(env.airTemp) : 0,
      waterTemp: env.waterTemp !== undefined ? toInt(env.waterTemp) : 0,
      currentKnots: env.currentKnots !== undefined ? toInt(env.currentKnots) : 0,
      bottomType: bottomR.value,
      coords: {
        latitude: latDeg,
        longitude: lonDeg,
      },
      location: String(env.location ?? env.site ?? ""),
      weatherConditions: String(env.weather ?? ""),
    },
    decomp: {
      decompType: decompR.value,
      totalDecompTimeMinutes: dec.totalMinutes !== undefined ? toInt(dec.totalMinutes) : 0,
      maxDepthAttained:
        dec.maxDepthAttained !== undefined ? toInt(dec.maxDepthAttained)
          : Number.isFinite(maxDepth) ? maxDepth : 0,
      tableSchedule: schedule,
      repetitiveGroup: groupOf(dec.repetitiveGroup),
      surfaceIntervalMinutes:
        d.surfaceIntervalMinutes !== undefined ? toInt(d.surfaceIntervalMinutes) : 0,
      newRepetitiveGroup: groupOf(dec.newRepetitiveGroup),
    },
    gas: {
      gasType: gasR.value,
      o2Percent,
      hePercent,
      n2Percent,
      cylinderPressureIn: cylIn,
      cylinderPressureOut: cylOut,
      gasConsumed,
      bailoutPressure: g.bailoutPressure !== undefined ? toInt(g.bailoutPressure) : 0,
    },
    remarks: String(d.remarks ?? d.notes ?? ""),
  };

  return { key: nextRowKey(), sourceIndex: index, input, warnings };
}

// ---------------------------------------------------------------------------
// 2. Evidence-core (commercial_dive_logs) - faithful port of gen_batches.py
// ---------------------------------------------------------------------------

interface EvidenceDive {
  date: string;
  job_number?: string;
  location?: string;
  dive_times?: {
    left_surface_ls?: string;
    left_bottom_lb?: string;
    reached_surface_rs?: string;
    bottom_time_minutes?: number | string;
    total_time_minutes?: number | string;
  };
  decompression_table?: { leave_bottom_schedule?: string };
  depth?: { max_depth_raw?: string | number };
  operations?: { objective?: string; work_completed?: string; remarks?: string };
}

/** Keyword -> purpose, mirroring gen_batches.purpose(). */
function evidencePurpose(objective: string): number {
  const o = String(objective ?? "").toUpperCase();
  if (o.includes("INSPECT")) return DivePurpose.Inspection;
  if (["REPAIR", "REPLACEMENT", "CHAIN", "RIP RAP", "HULL"].some((k) => o.includes(k)))
    return DivePurpose.Repair;
  if (o.includes("LOCAT") || o.includes("SEARCH")) return DivePurpose.Search;
  if (["CLEAN", "JETT", "DEBRIS", "PILE", "PILING"].some((k) => o.includes(k)))
    return DivePurpose.Construction;
  return DivePurpose.Other;
}

/** Schedule -> decomp type, mirroring gen_batches.decomp(). */
function evidenceDecompType(schedule: string): number {
  const s = String(schedule ?? "").toUpperCase();
  if (s.includes("UNLIMITED")) return DecompressionType.NoneDecomp;
  if (s.startsWith("190/")) return DecompressionType.SurfaceDecompO2;
  return DecompressionType.Standard;
}

/** Evidence-core logs are US commercial dives on US Navy air tables: the v2
 *  header stores the tokenized schedule ("USN 60/40"), capped at 16 chars.
 *  UNLIMITED means the table was used with no deco schedule: token only. */
function evidenceTableSchedule(schedule: string): string {
  const s = String(schedule ?? "").trim();
  if (!s) return "";
  if (s.toUpperCase().includes("UNLIMITED")) return "USN";
  return (`USN ${s}`).slice(0, 16);
}

function mapEvidenceDive(d: EvidenceDive, index: number, prev: { date: string; rs: number } | null): ParsedRow {
  const warnings: string[] = [];
  const times = d.dive_times ?? {};

  const ls = utcClock(d.date, String(times.left_surface_ls ?? ""));
  const lb = utcClock(d.date, String(times.left_bottom_lb ?? ""));
  const rs = utcClock(d.date, String(times.reached_surface_rs ?? ""));

  // Surface interval: gap from the previous dive the same day (UTC calendar).
  const si = prev && prev.date === d.date && prev.rs > 0 && ls > prev.rs
    ? Math.max(0, Math.floor((ls - prev.rs) / 60))
    : 0;

  const bt = toInt(times.bottom_time_minutes);
  const tt = toInt(times.total_time_minutes);
  const depRaw = d.depth?.max_depth_raw;
  const dep = depRaw !== undefined ? leadingInt(depRaw) : NaN;
  const schedule = String(d.decompression_table?.leave_bottom_schedule ?? "");
  const objective = String(d.operations?.objective ?? "");
  const decompTotal = Number.isFinite(tt) && Number.isFinite(bt) ? Math.max(0, tt - bt) : 0;

  if (depRaw !== undefined && Number.isFinite(dep) && /m\b|m$|msw/i.test(String(depRaw))) {
    warnings.push('Depth string looks metric ("m"/"msw") but the evidence mapping is Imperial - verify before logging');
  }

  const remarks = [
    objective,
    String(d.operations?.work_completed ?? ""),
    d.job_number !== undefined && d.job_number !== null && String(d.job_number) !== ""
      ? `JOB ${d.job_number}` : "",
    String(d.operations?.remarks ?? ""),
  ].join(" | ").trim();

  const input: DiveDraft = {
    diveDate: String(d.date).slice(0, 10),
    units: UnitSystem.Imperial,
    data: {
      leaveSurfaceTime: ls,
      leaveBottomTime: lb,
      reachSurfaceTime: rs,
      bottomTimeMinutes: bt,
      maxDepth: dep,
      averageDepth: dep,
      mode: DiveMode.SurfaceSupplied,
      purpose: evidencePurpose(objective),
      suit: SuitType.Dry,
    },
    env: {
      airTemp: 0,
      waterTemp: 0,
      currentKnots: 0,
      bottomType: BottomType.Other,
      coords: { latitude: 0, longitude: 0 },
      location: String(d.location ?? ""),
      weatherConditions: "",
    },
    decomp: {
      decompType: evidenceDecompType(schedule),
      totalDecompTimeMinutes: decompTotal,
      maxDepthAttained: dep,
      tableSchedule: evidenceTableSchedule(schedule),
      repetitiveGroup: "",
      surfaceIntervalMinutes: si,
      newRepetitiveGroup: "",
    },
    gas: {
      gasType: BreathingGas.Air,
      o2Percent: 21,
      hePercent: 0,
      n2Percent: 79,
      cylinderPressureIn: 0,
      cylinderPressureOut: 0,
      gasConsumed: 0,
      bailoutPressure: 0,
    },
    remarks,
  };

  return { key: nextRowKey(), sourceIndex: index, input, warnings };
}

function mapEvidenceDoc(doc: Record<string, unknown>): ParsedRow[] {
  const logs = doc.commercial_dive_logs;
  if (!Array.isArray(logs)) throw new ImportError("commercial_dive_logs must be an array");
  const rows: ParsedRow[] = [];
  let prev: { date: string; rs: number } | null = null;
  for (let i = 0; i < logs.length; i++) {
    const row = mapEvidenceDive(logs[i] as EvidenceDive, i + 1, prev);
    rows.push(row);
    if (row.input.data.reachSurfaceTime > 0) {
      prev = { date: (logs[i] as EvidenceDive).date, rs: row.input.data.reachSurfaceTime };
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. Heuristic JSON sniffing (best effort, human reviews everything anyway)
// ---------------------------------------------------------------------------

const DATE_KEYS = ["date", "diveDate", "dive_date", "datetime", "startDate", "start_date", "timestamp"];
const DEPTH_KEYS = ["maxDepth", "max_depth", "maxDepthRaw", "max_depth_raw", "maxdepth", "depth"];
const BT_KEYS = ["bottomTimeMinutes", "bottom_time_minutes", "bottomTime", "bottom_time", "durationMinutes", "duration_minutes", "duration"];
const LOCATION_KEYS = ["location", "site", "siteName", "site_name", "diveSite", "dive_site", "locationName", "location_name"];
const REMARKS_KEYS = ["remarks", "notes", "comments", "comment", "note", "description"];
const TIMES_KEYS = ["times", "dive_times", "diveTimes", "time"];
const LS_KEYS = ["leftSurface", "left_surface", "left_surface_ls", "leftSurfaceTime", "leaveSurface"];
const LB_KEYS = ["leftBottom", "left_bottom", "left_bottom_lb", "leftBottomTime", "leaveBottom"];
const RS_KEYS = ["reachedSurface", "reached_surface", "reached_surface_rs", "reachSurfaceTime", "reached_surface_time"];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return undefined;
}

function findDiveArray(doc: unknown): { arr: unknown[]; path: string } | null {
  const candidates: { arr: unknown[]; path: string; score: number }[] = [];
  const consider = (arr: unknown, path: string, score: number): void => {
    if (Array.isArray(arr) && arr.length > 0 && arr.every((x) => typeof x === "object" && x !== null && !Array.isArray(x))) {
      candidates.push({ arr, path, score });
    }
  };
  if (Array.isArray(doc)) consider(doc, "(root array)", 3);
  else if (typeof doc === "object" && doc !== null) {
    for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
      const friendly = /^(dives?|logs?|records?|entries|dive_logs|diveLogs|history)$/i.test(key);
      consider(value, key, friendly ? 3 : 1);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [k2, v2] of Object.entries(value as Record<string, unknown>)) {
          const friendly2 = friendly || /^(dives?|logs?|records?)$/i.test(k2);
          consider(v2, `${key}.${k2}`, friendly2 ? 2 : 0.5);
        }
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score || b.arr.length - a.arr.length);
  return candidates[0] ? { arr: candidates[0].arr, path: candidates[0].path } : null;
}

function mapHeuristicDoc(doc: unknown): { rows: ParsedRow[]; notes: string[] } {
  const found = findDiveArray(doc);
  if (!found) throw new ImportError("Could not find an array of dive-like records in this JSON.");
  const notes = [`Best-effort mapping of "${found.path}" (${found.arr.length} records) - review every row before logging.`];

  // Whole-file units inference from depth strings like "57 ft" / "18 m".
  let sawFt = false;
  let sawM = false;
  for (const item of found.arr) {
    const depth = pick(item as Record<string, unknown>, DEPTH_KEYS);
    if (typeof depth === "string") {
      if (/\b(f?t|fsw|feet)\b/i.test(depth)) sawFt = true;
      if (/\b(m|meters?|msw)\b/i.test(depth)) sawM = true;
    }
  }
  const units = sawFt && !sawM ? UnitSystem.Imperial : UnitSystem.Metric;
  if (!sawFt && !sawM) notes.push("No units found in depth values - assumed Metric. Change per dive if needed.");

  const rows: ParsedRow[] = [];
  for (let i = 0; i < found.arr.length; i++) {
    const item = found.arr[i] as Record<string, unknown>;
    const warnings: string[] = [];

    const dateRaw = pick(item, DATE_KEYS);
    const dateStr = dateRaw !== undefined ? String(dateRaw) : "";
    const diveDate = dateStr ? dateStr.slice(0, 10) : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(diveDate)) warnings.push('Missing or unparseable date ("YYYY-MM-DD")');

    // Times may sit at the top level or nested under a times/dive_times object.
    const timesRaw = pick(item, TIMES_KEYS) as Record<string, unknown> | undefined;
    const times = timesRaw && typeof timesRaw === "object" ? timesRaw : {};

    // Depth may be a plain value or nested like { depth: { max_depth_raw: "57 ft" } }.
    const depthOuter = pick(item, DEPTH_KEYS);
    const depthRaw =
      depthOuter !== undefined && typeof depthOuter === "object" && depthOuter !== null
        ? pick(depthOuter as Record<string, unknown>, DEPTH_KEYS) ?? depthOuter
        : depthOuter;
    let maxDepth: number;
    if (depthRaw === undefined) {
      maxDepth = NaN;
      warnings.push("Missing max depth");
    } else if (typeof depthRaw === "string" && /m\b|msw/i.test(depthRaw) && units === UnitSystem.Imperial) {
      maxDepth = leadingInt(depthRaw);
      warnings.push('Depth says meters but the file looks Imperial - fix the number or the units');
    } else {
      maxDepth = typeof depthRaw === "string" ? leadingInt(depthRaw) : toInt(depthRaw);
    }

    const btRaw = pick(item, BT_KEYS) ?? pick(times, BT_KEYS);
    const bottomTimeMinutes = btRaw !== undefined ? toInt(btRaw) : NaN;
    if (!Number.isFinite(bottomTimeMinutes)) warnings.push("Missing bottom time");

    const clockOf = (keys: string[]): number => {
      const v = pick(times, keys) ?? pick(item, keys);
      return parseTimePoint(dateStr.split("T")[0], v);
    };
    const leaveSurfaceTime = clockOf(LS_KEYS);
    const leaveBottomTime = clockOf(LB_KEYS);
    const reachSurfaceTime = clockOf(RS_KEYS);

    const input: DiveDraft = {
      diveDate,
      units,
      data: {
        leaveSurfaceTime,
        leaveBottomTime,
        reachSurfaceTime,
        bottomTimeMinutes,
        maxDepth,
        averageDepth: Number.isFinite(maxDepth) ? maxDepth : 0,
        mode: DiveMode.OCRecreational,
        purpose: DivePurpose.Recreational,
        suit: SuitType.Wet,
      },
      env: {
        airTemp: 0,
        waterTemp: 0,
        currentKnots: 0,
        bottomType: BottomType.Other,
        coords: { latitude: 0, longitude: 0 },
        location: String(pick(item, LOCATION_KEYS) ?? ""),
        weatherConditions: "",
      },
      decomp: {
        decompType: DecompressionType.NoneDecomp,
        totalDecompTimeMinutes: 0,
        maxDepthAttained: Number.isFinite(maxDepth) ? maxDepth : 0,
        tableSchedule: "",
        repetitiveGroup: "",
        surfaceIntervalMinutes: 0,
        newRepetitiveGroup: "",
      },
      gas: {
        gasType: BreathingGas.Air,
        o2Percent: 21,
        hePercent: 0,
        n2Percent: 79,
        cylinderPressureIn: 0,
        cylinderPressureOut: 0,
        gasConsumed: 0,
        bailoutPressure: 0,
      },
      remarks: String(pick(item, REMARKS_KEYS) ?? ""),
    };

    rows.push({ key: nextRowKey(), sourceIndex: i + 1, input, warnings });
  }
  return { rows, notes };
}

// ---------------------------------------------------------------------------
// Detection & entry point
// ---------------------------------------------------------------------------

function looksLikeEvidenceCore(doc: unknown): boolean {
  return (
    typeof doc === "object" && doc !== null &&
    Array.isArray((doc as Record<string, unknown>).commercial_dive_logs)
  );
}

function standardArray(doc: unknown): unknown[] | null {
  // Explicit wrapper: trust the self-declared format, validation catches junk.
  if (typeof doc === "object" && doc !== null) {
    const o = doc as Record<string, unknown>;
    if (o.format === "divechain-batch-json" && Array.isArray(o.dives)) return o.dives;
  }
  const arrays: unknown[][] = [];
  if (Array.isArray(doc)) arrays.push(doc);
  else if (typeof doc === "object" && doc !== null && Array.isArray((doc as Record<string, unknown>).dives))
    arrays.push((doc as Record<string, unknown>).dives as unknown[]);
  for (const arr of arrays) {
    if (arr.length === 0) continue;
    // Claim the file only when every row actually looks like the standard;
    // anything less goes to the heuristic parser, which is allowed to guess
    // field aliases and flags what it cannot map.
    const hits = arr.filter((x) => {
      if (typeof x !== "object" || x === null) return false;
      const r = x as Record<string, unknown>;
      return (
        (r.date !== undefined || r.diveDate !== undefined) &&
        (r.bottomTimeMinutes !== undefined || r.times !== undefined || r.maxDepth !== undefined)
      );
    }).length;
    if (hits === arr.length) return arr;
  }
  return null;
}

/** Parse an uploaded JSON document into import rows. Throws ImportError for
 *  files that cannot be interpreted at all. */
export function parseDiveFile(text: string): ParseResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    throw new ImportError(`Not valid JSON: ${(e as Error).message}`);
  }

  // 1. Evidence-core repair format
  if (looksLikeEvidenceCore(doc)) {
    return {
      format: "evidence-core",
      formatLabel: "Commercial logbook (evidence core)",
      rows: mapEvidenceDoc(doc as Record<string, unknown>),
      notes: ["Times interpreted as UTC, Imperial units, dry suit, surface supplied - the established evidence mapping. Edit any dive to adjust."],
    };
  }

  // 2. Divechain Batch JSON
  const std = standardArray(doc);
  if (std) {
    return {
      format: "divechain-json",
      formatLabel: "Divechain Batch JSON",
      rows: std.map((d, i) => mapStandardDive(d, i + 1)),
      notes: [],
    };
  }

  // 3. Heuristic best-effort
  const { rows, notes } = mapHeuristicDoc(doc);
  if (rows.length === 0) throw new ImportError("No dive records found in this file.");
  return { format: "heuristic-json", formatLabel: "Generic JSON (best effort)", rows, notes };
}

// ---------------------------------------------------------------------------
// Validation - mirror the contract's own guards (PAPER-IX)
// ---------------------------------------------------------------------------

const UINT32_MAX = 4294967295;

/** Blockers: reasons the contract would revert or the ABI cannot encode.
 *  An empty array means the row can be logged. Mirrors
 *  SovereignDiveLog._validate for every rule the client can see. */
export function validateDiveDraft(draft: DiveDraft): string[] {
  const issues: string[] = [];
  const d = draft.data;

  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(draft.diveDate)) {
    issues.push("Dive date is missing or not a valid YYYY-MM-DD calendar date");
  } else {
    const [y] = draft.diveDate.split("-").map(Number);
    if (y < 1970) issues.push("Dive dates before 1970 cannot be logged (the header encodes YYYYMMDD from 1970)");
    const today = new Date();
    const todayYmd = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
    const ymd = y * 10000 + Number(draft.diveDate.slice(5, 7)) * 100 + Number(draft.diveDate.slice(8, 10));
    if (ymd > todayYmd) issues.push("Dive date is in the future - you cannot log a dive that has not happened");
  }

  if (!Number.isFinite(d.maxDepth) || d.maxDepth <= 0) issues.push("Max depth must be a positive number");
  else if (depthToTenths(d.maxDepth) > UINT32_MAX) issues.push("Max depth is out of range");
  else if (d.maxDepth > 1000) issues.push(`Max depth ${d.maxDepth} is beyond any recorded dive - fix the units or the number`);

  if (!Number.isFinite(d.bottomTimeMinutes) || d.bottomTimeMinutes <= 0)
    issues.push("Bottom time must be a positive number of minutes");
  else if (d.bottomTimeMinutes > 1440) issues.push(`Bottom time ${d.bottomTimeMinutes} min exceeds 24 h - verify before logging`);

  if (d.leaveSurfaceTime > 0 && d.reachSurfaceTime > 0 && d.reachSurfaceTime <= d.leaveSurfaceTime)
    issues.push("Reached-surface time must be after the leave-surface time");
  if (d.leaveBottomTime > 0 && d.leaveSurfaceTime > 0 && d.leaveBottomTime < d.leaveSurfaceTime)
    issues.push("Leave-bottom time must be after the leave-surface time");

  const gasTotal = draft.gas.o2Percent + draft.gas.hePercent;
  if (gasTotal > 100) issues.push(`Gas mix sums to ${gasTotal}% - O2 + He must not exceed 100%`);

  const schedule = String(draft.decomp.tableSchedule ?? "").trim();
  if (schedule) {
    if (!parseTableSchedule(schedule)) {
      issues.push(`Table schedule "${schedule}" is not "<TOKEN>[ <schedule>]" with a known token (USN, PADI, NAUI, BSAC, BUEHL, DCIEM, CSMD, COMEX, OTHER)`);
    } else if (schedule.length > 16) {
      issues.push("Table schedule is longer than 16 characters (the bytes16 header field)");
    }
  }
  const rg = String(draft.decomp.repetitiveGroup ?? "").trim().toUpperCase();
  const rgAfter = String(draft.decomp.newRepetitiveGroup ?? "").trim().toUpperCase();
  if (rg && !/^[A-Z]$/.test(rg)) issues.push("Repetitive group must be a single letter A-Z");
  if (rgAfter && !/^[A-Z]$/.test(rgAfter)) issues.push("Post-interval repetitive group must be a single letter A-Z");
  if ((rg || rgAfter) && !schedule) issues.push("A repetitive group letter requires a table schedule (the letters are table-family-specific)");
  if (rgAfter && !(draft.decomp.surfaceIntervalMinutes > 0))
    issues.push("The post-interval repetitive group requires a recorded surface interval");

  return issues;
}

// ---------------------------------------------------------------------------
// Dedup against what is already on chain + within the file itself
// ---------------------------------------------------------------------------

/** Match key: UTC day | units | bottom time (s) | max depth (tenths).
 *  Units-aware so 57 ft never collides with 57 m. Voided dives still count -
 *  re-logging a voided record would create a duplicate (corrections get new
 *  keys). Uses the same derivation the header will carry. */
export function dedupKeyOfDraft(draft: DiveDraft): string {
  const { diveDate, bottomTimeSeconds, maxDepth } = dedupFieldsOfDraft(draft);
  return `${diveDate}|${draft.units}|${bottomTimeSeconds}|${maxDepth}`;
}

/** Header fields used for dedup, derived identically to draftToHeader. */
export function dedupFieldsOfDraft(draft: DiveDraft): {
  diveDate: number;
  bottomTimeSeconds: number;
  maxDepth: number;
} {
  const timing = draftTiming(draft);
  const ymd =
    Number(draft.data.leaveSurfaceTime) > 0
      ? ymdOfUnix(Number(draft.data.leaveSurfaceTime))
      : stringToYmd(draft.diveDate);
  return {
    diveDate: ymd,
    bottomTimeSeconds: timing.bottomTimeSeconds || timing.durationSeconds,
    maxDepth: depthToTenths(Number(draft.data.maxDepth) || 0),
  };
}

export interface ChainDiveKey {
  id: bigint | number;
  diveDate: number; // uint32 YYYYMMDD
  units: number;
  bottomTimeSeconds: number;
  maxDepth: number; // tenths
}

export function buildChainIndex(dives: ChainDiveKey[]): Map<string, bigint> {
  const index = new Map<string, bigint>();
  for (const d of dives) {
    const key = `${d.diveDate}|${d.units}|${d.bottomTimeSeconds || 0}|${d.maxDepth}`;
    if (!index.has(key)) index.set(key, BigInt(d.id));
  }
  return index;
}

// ---------------------------------------------------------------------------
// Row analysis & chunking
// ---------------------------------------------------------------------------

export type RowStatus = "new" | "on-chain" | "duplicate" | "invalid";

export interface AnalyzedRow extends ParsedRow {
  status: RowStatus;
  /** On-chain dive id this row duplicates (when status is "on-chain"). */
  matchedDiveId?: bigint;
  /** Validation blockers (when status is "invalid"). */
  issues: string[];
}

/** Attach status to parsed rows: on-chain duplicates first (chain is truth),
 *  then within-file duplicates (first occurrence wins), then validation. */
export function analyzeRows(rows: ParsedRow[], chainIndex: Map<string, bigint>): AnalyzedRow[] {
  const seenInFile = new Set<string>();
  return rows.map((row) => {
    const key = dedupKeyOfDraft(row.input);
    const issues = validateDiveDraft(row.input);
    const matchedDiveId = chainIndex.get(key);
    if (matchedDiveId !== undefined) {
      return { ...row, status: "on-chain", matchedDiveId, issues };
    }
    if (issues.length > 0) {
      return { ...row, status: "invalid", issues };
    }
    if (seenInFile.has(key)) {
      return { ...row, status: "duplicate", issues: [] };
    }
    seenInFile.add(key);
    return { ...row, status: "new", issues: [] };
  });
}

/** v2 headers measure ~154k gas each on the reference suite. 8 dives per
 *  transaction (~1.25M gas) keeps signings reviewable and far under both the
 *  block ceiling and the contract's MAX_BATCH_SIZE of 100 (SPEC-6). */
export const DIVES_PER_TX = 8;

export function chunkInputs<T>(items: T[], size: number = DIVES_PER_TX): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
