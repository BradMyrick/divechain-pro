import SovereignDiveLogArtifact from "../contracts/SovereignDiveLog.json";

export const SOVEREIGN_DIVE_LOG_ABI = SovereignDiveLogArtifact.abi;
export const SOVEREIGN_DIVE_LOG_BYTECODE =
  SovereignDiveLogArtifact.bytecode as `0x${string}`;
export const SOVEREIGN_DIVE_LOG_DEPLOYED_BYTECODE =
  SovereignDiveLogArtifact.deployedBytecode as `0x${string}`;

/** ERC-165 interface id for IDiveLog (compiler-computed type(IDiveLog).interfaceId). */
export const IDIVELOG_INTERFACE_ID = "0x4d89a8f9";

export const UnitSystem = {
  Imperial: 0,
  Metric: 1,
} as const;
export type UnitSystem = (typeof UnitSystem)[keyof typeof UnitSystem];

/** The v2 on-chain DiveMode set (deployment/src/interfaces/IDiveLogTypes.sol). */
export const DiveMode = {
  OCRecreational: 0,
  OCTechnical: 1,
  CCR: 2,
  SCR: 3,
  Freedive: 4,
  SurfaceSupplied: 5,
  Saturation: 6,
} as const;
export type DiveMode = (typeof DiveMode)[keyof typeof DiveMode];

// ---------------------------------------------------------------------------
// Off-chain record vocabulary. v2 keeps only the thin header on-chain; these
// enums describe the rich DiveDraft (form, batch JSON, UDDF) and never cross
// the ABI boundary.
// ---------------------------------------------------------------------------

export const DivePurpose = {
  Training: 0,
  Inspection: 1,
  Repair: 2,
  Search: 3,
  Salvage: 4,
  Recovery: 5,
  Construction: 6,
  Research: 7,
  EOD: 8,
  Security: 9,
  Photographic: 10,
  Recreational: 11,
  Other: 12,
} as const;
export type DivePurpose = (typeof DivePurpose)[keyof typeof DivePurpose];

export const SuitType = {
  Wet: 0,
  Dry: 1,
  HotWater: 2,
  Swim: 3,
} as const;
export type SuitType = (typeof SuitType)[keyof typeof SuitType];

export const BottomType = {
  Sand: 0,
  Coral: 1,
  Rock: 2,
  Wreck: 3,
  Silt: 4,
  Other: 5,
} as const;
export type BottomType = (typeof BottomType)[keyof typeof BottomType];

export const BreathingGas = {
  Air: 0,
  Nitrox: 1,
  Heliox: 2,
  Trimix: 3,
  Oxygen: 4,
  Mixed: 5,
} as const;
export type BreathingGas = (typeof BreathingGas)[keyof typeof BreathingGas];

export const DecompressionType = {
  NoneDecomp: 0,
  Standard: 1,
  SurfaceDecompO2: 2,
  SurfaceDecompAir: 3,
  Saturation: 4,
  Repetitive: 5,
  ExceptionalExposure: 6,
} as const;
export type DecompressionType =
  (typeof DecompressionType)[keyof typeof DecompressionType];

export const UNIT_SYSTEM_LABELS: Record<number, string> = {
  [UnitSystem.Imperial]: "Imperial",
  [UnitSystem.Metric]: "Metric",
};

export const DIVE_MODE_LABELS: Record<number, string> = {
  [DiveMode.OCRecreational]: "OC Recreational",
  [DiveMode.OCTechnical]: "OC Technical",
  [DiveMode.CCR]: "CCR",
  [DiveMode.SCR]: "SCR",
  [DiveMode.Freedive]: "Freedive",
  [DiveMode.SurfaceSupplied]: "Surface Supplied",
  [DiveMode.Saturation]: "Saturation",
};

/** Public token names for the batch JSON standard (legacy v1 aliases included). */
export const DIVE_MODE_TOKENS = [
  "oc-recreational",
  "oc-technical",
  "ccr",
  "scr",
  "freedive",
  "surface-supplied",
  "saturation",
] as const;

export const DIVE_PURPOSE_LABELS: Record<number, string> = {
  [DivePurpose.Training]: "Training",
  [DivePurpose.Inspection]: "Inspection",
  [DivePurpose.Repair]: "Repair",
  [DivePurpose.Search]: "Search",
  [DivePurpose.Salvage]: "Salvage",
  [DivePurpose.Recovery]: "Recovery",
  [DivePurpose.Construction]: "Construction",
  [DivePurpose.Research]: "Research",
  [DivePurpose.EOD]: "EOD",
  [DivePurpose.Security]: "Security",
  [DivePurpose.Photographic]: "Photographic",
  [DivePurpose.Recreational]: "Recreational",
  [DivePurpose.Other]: "Other",
};

export const SUIT_TYPE_LABELS: Record<number, string> = {
  [SuitType.Wet]: "Wet",
  [SuitType.Dry]: "Dry",
  [SuitType.HotWater]: "Hot Water",
  [SuitType.Swim]: "Swim",
};

export const BOTTOM_TYPE_LABELS: Record<number, string> = {
  [BottomType.Sand]: "Sand",
  [BottomType.Coral]: "Coral",
  [BottomType.Rock]: "Rock",
  [BottomType.Wreck]: "Wreck",
  [BottomType.Silt]: "Silt",
  [BottomType.Other]: "Other",
};

export const BREATHING_GAS_LABELS: Record<number, string> = {
  [BreathingGas.Air]: "Air",
  [BreathingGas.Nitrox]: "Nitrox",
  [BreathingGas.Heliox]: "Heliox",
  [BreathingGas.Trimix]: "Trimix",
  [BreathingGas.Oxygen]: "Oxygen",
  [BreathingGas.Mixed]: "Mixed",
};

export const DECOMP_TYPE_LABELS: Record<number, string> = {
  [DecompressionType.NoneDecomp]: "None",
  [DecompressionType.Standard]: "Standard",
  [DecompressionType.SurfaceDecompO2]: "Surface Decomp O2",
  [DecompressionType.SurfaceDecompAir]: "Surface Decomp Air",
  [DecompressionType.Saturation]: "Saturation",
  [DecompressionType.Repetitive]: "Repetitive",
  [DecompressionType.ExceptionalExposure]: "Exceptional Exposure",
};

/** Depth/temperature unit suffix helpers driven by a dive's UnitSystem. */
export function depthUnit(units: UnitSystem | number): string {
  return UNIT_SYSTEM_LABELS[units] === "Metric" ? "m" : "ft";
}
export function pressureUnit(units: UnitSystem | number): string {
  return UNIT_SYSTEM_LABELS[units] === "Metric" ? "bar" : "psi";
}
export function tempUnit(units: UnitSystem | number): string {
  return UNIT_SYSTEM_LABELS[units] === "Metric" ? "\u00B0C" : "\u00B0F";
}

// ---------------------------------------------------------------------------
// v2 header encoding helpers
// ---------------------------------------------------------------------------

/** Normative first tokens accepted in `tableSchedule` (IDiveLog behavior rules). */
export const TABLE_SCHEDULE_TOKENS = [
  "USN",
  "PADI",
  "NAUI",
  "BSAC",
  "BUEHL",
  "DCIEM",
  "CSMD",
  "COMEX",
  "OTHER",
] as const;

/** Token -> the UDDF `<divetable><name>` keyword (ERC-8260 field encodings). */
export const TABLE_TOKEN_TO_UDDF: Record<string, string> = {
  USN: "US-Navy",
  PADI: "PADI",
  NAUI: "NAUI",
  BSAC: "BSAC",
  BUEHL: "Buehlmann",
  DCIEM: "DCIEM",
  CSMD: "CSMD",
  COMEX: "COMEX",
  OTHER: "other",
};

/** Split "<TOKEN>[ <schedule>]" into its parts; null when malformed. */
export function parseTableSchedule(s: string): { token: string; schedule: string } | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const [token, ...rest] = trimmed.split(" ");
  const schedule = rest.join(" ").trim();
  if (schedule.includes(" ")) return null; // at most one space, per the ERC
  if (!(TABLE_SCHEDULE_TOKENS as readonly string[]).includes(token)) return null;
  return { token, schedule };
}

/** Whole display units -> uint32 tenths. */
export function depthToTenths(whole: number): number {
  return Math.max(0, Math.round(whole * 10));
}

/** uint32 tenths -> whole display units (one decimal preserved). */
export function tenthsToDepth(tenths: number): number {
  return Math.round(tenths) / 10;
}

/** Percent (0-100) -> basis points. */
export function percentToBps(percent: number): number {
  return Math.max(0, Math.min(10000, Math.round(percent * 100)));
}

/** Basis points -> percent. */
export function bpsToPercent(bps: number): number {
  return Math.round(bps) / 100;
}

/** "A"-"Z" -> bytes1 hex; "" -> 0x00. */
export function charToBytes1(c: string): `0x${string}` {
  const s = (c ?? "").trim();
  if (!s) return "0x00" as `0x${string}`;
  return (`0x${s.charCodeAt(0).toString(16).padStart(2, "0")}`) as `0x${string}`;
}

/** bytes1 hex -> "A"-"Z" or "". */
export function bytes1ToChar(hex: `0x${string}`): string {
  if (!hex || hex === "0x00") return "";
  const byte = parseInt(hex.slice(2, 4), 16);
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "";
}

/** Right-NUL-padded ASCII string -> bytes16 hex; "" -> bytes16(0). */
export function strToBytes16(s: string): `0x${string}` {
  let hex = "0x";
  for (let i = 0; i < 16; i++) {
    const byte = i < s.length ? s.charCodeAt(i) & 0xff : 0;
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}

/** bytes16 hex -> printable ASCII up to the first NUL, else "". */
export function bytes16ToStr(hex: `0x${string}`): string {
  if (!hex) return "";
  let out = "";
  for (let i = 2; i < Math.min(hex.length, 34); i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (byte === 0) break;
    if (byte < 32 || byte > 126) return "";
    out += String.fromCharCode(byte);
  }
  return out;
}

/** bytes4 hex -> the four ASCII geohash characters, "" when zero. */
export function bytes4ToGeohash(hex: `0x${string}`): string {
  if (!hex || hex === "0x00000000") return "";
  let out = "";
  for (let i = 2; i < Math.min(hex.length, 10); i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (byte === 0) break;
    if (byte < 32 || byte > 126) return "";
    out += String.fromCharCode(byte);
  }
  return out;
}

/** uint32 YYYYMMDD -> "YYYY-MM-DD". */
export function ymdToString(diveDate: number): string {
  const n = Number(diveDate);
  if (!Number.isFinite(n) || n < 19700101 || n > 99991231) return "";
  const y = Math.floor(n / 10000);
  const m = Math.floor(n / 100) % 100;
  const d = n % 100;
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" (or a parseable date string) -> uint32 YYYYMMDD, 0 when invalid. */
export function stringToYmd(day: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day ?? "").trim());
  if (!m) return 0;
  return Number(`${m[1]}${m[2]}${m[3]}`);
}

/** UTC calendar date (YYYYMMDD) of a unix-seconds timestamp. */
export function ymdOfUnix(unix: number): number {
  const d = new Date(unix * 1000);
  return (
    d.getUTCFullYear() * 10000 +
    (d.getUTCMonth() + 1) * 100 +
    d.getUTCDate()
  );
}

/** Human gas label from the header mix ("Air", "Nitrox 32%", "TMX 18/45"...). */
export function gasMixLabel(o2Bps: number, heBps: number): string {
  if (o2Bps === 0 && heBps === 0) return "Freedive";
  const o2 = bpsToPercent(o2Bps);
  const he = bpsToPercent(heBps);
  if (he > 0) return `TMX ${Math.round(o2)}/${Math.round(he)}`;
  if (o2Bps === 2100) return "Air";
  if (o2Bps === 10000) return "Oxygen";
  if (o2 > 21) return `Nitrox ${Math.round(o2)}%`;
  if (o2 < 21) return `Hypoxic ${Math.round(o2)}%`;
  return "Air";
}
