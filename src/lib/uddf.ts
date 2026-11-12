// Deterministic UDDF 3.2.3 writer: the dApp side of ERC-8260 v2's required
// `contentHash`.
//
// The contract stores SHA-256 of the exact attested UDDF bytes, so the writer
// must be a PURE function of the DiveDraft: same draft in, byte-identical UDDF
// out, on every device, forever. That is what makes an exported batch JSON
// re-loggable with matching hashes and what lets a verifier re-derive the
// commitment. Rules:
//   * no clock reads, no randomness, no locale-dependent formatting;
//   * no personal data: no diver name, address, birth date (privacy posture);
//   * header planning fields are mirrored into the file when nonzero, per the
//     ERC's publisher MUST (divetable keyword, surface interval, groups).
//
// Number formatting: one decimal place, always. XML reserved characters in
// free text are escaped.

import type { DiveDraft } from "./types";
import {
  DiveMode,
  UnitSystem,
  parseTableSchedule,
  TABLE_TOKEN_TO_UDDF,
} from "./contracts";

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/** FSW -> metres (UDDF depth units are always metric). */
const toMetres = (depthWhole: number, units: number): number =>
  units === UnitSystem.Imperial ? depthWhole * 0.3048 : depthWhole;

function apparatusOf(mode: number): string {
  switch (mode) {
    case DiveMode.CCR:
      return "rebreather-closed";
    case DiveMode.SCR:
      return "rebreather-semi-closed";
    case DiveMode.Freedive:
      return "apnea";
    case DiveMode.SurfaceSupplied:
      return "surface-supplied";
    case DiveMode.Saturation:
      return "saturation";
    case DiveMode.OCTechnical:
      return "open-scuba-technical";
    default:
      return "open-scuba";
  }
}

function isoUtc(unix: number): string {
  return new Date(unix * 1000).toISOString().replace(".000Z", "Z");
}

/** Unix seconds for the UTC calendar date at 12:00. Kept as the default
 *  startTime when a draft records no leave-surface clock (site convention:
 *  a date-only record stores noon UTC). */
export function noonUtc(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr).trim());
  if (!m) return 0;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0) / 1000);
}

/** Derived v2 header timing from a draft: startTime, duration, bottom time. */
export function draftTiming(d: DiveDraft): {
  startTime: number;
  durationSeconds: number;
  bottomTimeSeconds: number;
} {
  const ls = Number(d.data.leaveSurfaceTime) || 0;
  const rs = Number(d.data.reachSurfaceTime) || 0;
  const lb = Number(d.data.leaveBottomTime) || 0;
  const btSec = Math.max(0, Math.round(Number(d.data.bottomTimeMinutes) * 60));
  const decoSec = Math.max(0, Math.round(Number(d.decomp.totalDecompTimeMinutes) * 60));
  if (ls > 0 && rs > ls) {
    const duration = Math.max(1, Math.round(rs - ls));
    const bottom = lb > ls ? Math.min(Math.round(lb - ls), duration) : Math.min(btSec, duration);
    return { startTime: ls, durationSeconds: duration, bottomTimeSeconds: bottom };
  }
  // No wall clock: total time is bottom time plus deco, and when only one
  // time figure exists the header records just the total (ERC: bottom time 0
  // = not recorded) unless deco splits them.
  const duration = Math.max(1, btSec + decoSec);
  const bottom = decoSec > 0 ? Math.min(btSec, duration) : 0;
  return { startTime: ls > 0 ? ls : noonUtc(d.diveDate), durationSeconds: duration, bottomTimeSeconds: bottom };
}

/**
 * Serialize a DiveDraft to deterministic UDDF 3.2.3 bytes (as text; hash the
 * UTF-8 encoding, see `sha256Hex`).
 */
export function uddfFromDraft(d: DiveDraft): string {
  const { startTime, durationSeconds, bottomTimeSeconds } = draftTiming(d);
  const units = Number(d.units);
  const maxM = toMetres(Number(d.data.maxDepth) || 0, units);
  const avgWhole = Number(d.data.averageDepth);
  const avgM = avgWhole > 0 ? toMetres(avgWhole, units) : maxM * 0.7;

  const bt = bottomTimeSeconds > 0 ? bottomTimeSeconds : Math.round(durationSeconds / 2);
  const site = String(d.env.location ?? "").trim();

  const lat = Number(d.env.coords?.latitude) || 0;
  const lon = Number(d.env.coords?.longitude) || 0;
  const hasCoords = lat !== 0 || lon !== 0;

  const siSec = Math.round(Number(d.decomp.surfaceIntervalMinutes) * 60);
  const rg = String(d.decomp.repetitiveGroup ?? "").trim();
  const rgAfter = String(d.decomp.newRepetitiveGroup ?? "").trim();
  const schedule = parseTableSchedule(String(d.decomp.tableSchedule ?? ""));

  const notes: string[] = [];
  if (schedule) notes.push(`table=${schedule.token}${schedule.schedule ? " " + schedule.schedule : ""}`);
  if (rg) notes.push(`repetitive-group=${rg}`);
  if (rgAfter) notes.push(`repetitive-group-after-si=${rgAfter}`);
  if (String(d.remarks ?? "").trim()) notes.push(String(d.remarks).trim());

  const o2 = Number(d.gas.o2Percent) || 0;
  const he = Number(d.gas.hePercent) || 0;
  const hasGas = o2 > 0 || he > 0;

  const lines: string[] = [];
  const w = (indent: number, s: string): void => {
    lines.push(" ".repeat(indent) + s);
  };

  w(0, `<?xml version="1.0" encoding="UTF-8"?>`);
  w(0, `<UDDF version="3.2.3">`);
  w(2, `<generator>`);
  w(4, `<manufacturer id="divechain"/>`);
  w(4, `<name>DiveChain</name>`);
  w(4, `<version>2</version>`);
  w(2, `</generator>`);
  // No <diver> personal block: identity is the logbook contract, not a name.
  w(2, `<divesite id="site0">`);
  w(4, `<name>${esc(site || "Unnamed site")}</name>`);
  w(4, `<geography>`);
  if (site) w(6, `<location>${esc(site)}</location>`);
  if (hasCoords) {
    w(6, `<latitude>${fmt1(lat)}</latitude>`);
    w(6, `<longitude>${fmt1(lon)}</longitude>`);
  }
  w(4, `</geography>`);
  w(2, `</divesite>`);
  w(2, `<profiledata>`);
  w(4, `<repetitiongroup id="rg0">`);
  w(6, `<dive id="dive0">`);
  w(8, `<informationbeforedive>`);
  w(10, `<link ref="site0"/>`);
  w(10, `<datetime>${isoUtc(startTime)}</datetime>`);
  if (siSec > 0) {
    w(10, `<surfaceintervalbeforedive>`);
    w(12, `<passedtime>${siSec}</passedtime>`);
    w(10, `</surfaceintervalbeforedive>`);
  }
  w(10, `<apparatus><name>${esc(apparatusOf(Number(d.data.mode)))}</name></apparatus>`);
  if (hasGas) {
    w(10, `<tankdata>`);
    w(12, `<pressurebegin>${Math.round(Number(d.gas.cylinderPressureIn) || 0)}</pressurebegin>`);
    w(12, `<pressureend>${Math.round(Number(d.gas.cylinderPressureOut) || 0)}</pressureend>`);
    w(10, `</tankdata>`);
  }
  w(8, `</informationbeforedive>`);
  w(8, `<samples>`);
  // Square-profile waypoints from the header summary (clearly a summary: the
  // real depth/time samples, when they exist, replace these on import).
  w(10, `<waypoint><depth>0.0</depth><time>0.0</time></waypoint>`);
  w(10, `<waypoint><depth>${fmt1(maxM)}</depth><time>${fmt1(Math.round(bt / 2))}</time></waypoint>`);
  w(10, `<waypoint><depth>${fmt1(maxM)}</depth><time>${fmt1(bt)}</time></waypoint>`);
  w(10, `<waypoint><depth>0.0</depth><time>${fmt1(durationSeconds)}</time></waypoint>`);
  w(8, `</samples>`);
  w(8, `<informationafterdive>`);
  w(10, `<greatestdepth>${fmt1(maxM)}</greatestdepth>`);
  w(10, `<averagedepth>${fmt1(avgM)}</averagedepth>`);
  w(10, `<diveduration>${fmt1(durationSeconds)}</diveduration>`);
  if (hasGas) {
    w(10, `<gasdefinitions>`);
    w(12, `<mix id="mix0">`);
    w(14, `<name>${esc(o2 > 0 ? `EAN${Math.round(o2)}` : "gas")}</name>`);
    w(14, `<o2>${(o2 / 100).toFixed(2)}</o2>`);
    w(14, `<he>${(he / 100).toFixed(2)}</he>`);
    w(14, `<n2>${(Math.max(0, 100 - o2 - he) / 100).toFixed(2)}</n2>`);
    w(12, `</mix>`);
    w(10, `</gasdefinitions>`);
  }
  if (schedule) {
    w(10, `<divetable><name>${esc(TABLE_TOKEN_TO_UDDF[schedule.token] ?? "other")}</name></divetable>`);
  }
  w(8, `</informationafterdive>`);
  if (notes.length > 0) {
    w(8, `<notes>${esc(notes.join(" | "))}</notes>`);
  }
  w(6, `</dive>`);
  w(4, `</repetitiongroup>`);
  w(2, `</profiledata>`);
  w(0, `</UDDF>`);

  return lines.join("\n") + "\n";
}

/** SHA-256 of the UTF-8 encoding of `text`, as the 0x-prefixed bytes32 the
 *  contract stores. Async: WebCrypto is the only SHA-256 in the browser. */
export async function sha256Hex(text: string): Promise<`0x${string}`> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = new Uint8Array(digest);
  let hex = "0x";
  for (const b of arr) hex += b.toString(16).padStart(2, "0");
  return hex as `0x${string}`;
}
