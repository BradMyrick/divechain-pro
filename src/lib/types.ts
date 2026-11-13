// TS mirrors of the on-chain ERC-8260 v2 structs (see
// deployment/src/interfaces/IDiveLogTypes.sol). Numeric fields are numbers
// because they fit; id crosses the ABI boundary as bigint.
//
// v2 is a thin packed header: the rich record (purpose, suit, environment,
// cylinder pressures, remarks, samples) lives off-chain in the UDDF profile
// committed to by `contentHash`. `DiveDraft` below is that rich record as the
// dApp edits and exports it; it never goes on-chain.

export interface DiveInput {
  diveDate: number; // uint32 UTC calendar date as YYYYMMDD (e.g. 20260514)
  startTime: number; // uint64 unix seconds UTC: instant the diver leaves the surface
  maxDepth: number; // uint32 tenths of FSW (Imperial) or MSW (Metric)
  durationSeconds: number; // uint32 total dive time, surface to surface
  bottomTimeSeconds: number; // uint32 leave surface to beginning of ascent; 0 = not recorded
  mode: number; // DiveMode enum
  units: number; // UnitSystem enum
  o2Bps: number; // uint16 O2 of the primary gas in basis points (2100 = 21.00%)
  heBps: number; // uint16 He in basis points; N2 implied as 10000 - o2Bps - heBps
  tableSchedule: `0x${string}`; // bytes16 ASCII "<TOKEN>[ <schedule>]", right-NUL-padded
  surfaceIntervalSeconds: number; // uint32 surface interval before this dive; 0 = n/a
  repetitiveGroup: `0x${string}`; // bytes1 ASCII 'A'-'Z' at end of dive; 0x00 = not recorded
  repetitiveGroupAfterSI: `0x${string}`; // bytes1 'A'-'Z' after the preceding SI; 0x00 = not recorded
  coarseGeohash: `0x${string}`; // bytes4 geohash precision 4; bytes4(0) = not recorded
  contentHash: `0x${string}`; // bytes32 REQUIRED: SHA-256 of the exact attested UDDF bytes
  profileURI: string; // MAY be empty; SHOULD be content-addressed (ipfs:// or ar://)
}

/** A stored dive header, as returned by `getDive`. */
export interface DiveHeader extends DiveInput {
  id: bigint; // contract-assigned sequence starting at 1; the dive number
}

export interface VoidInfo {
  supersededById: bigint;
  isVoided: boolean;
  voidedBy: `0x${string}`;
  voidedAt: number; // uint64 unix
  reason: string;
}

export interface Attestation {
  attester: `0x${string}`;
  attestedAt: number; // uint64 unix
  nonce: bigint;
}

/**
 * The rich off-chain dive record. This is what the form collects, what the
 * batch JSON standard carries, and what the deterministic UDDF writer
 * serializes (so the same draft always hashes to the same contentHash).
 * It is stored locally keyed by contentHash and never goes on-chain.
 */
export interface DiveDraft {
  diveDate: string; // YYYY-MM-DD (the UTC calendar day of the dive)
  units: number; // UnitSystem enum
  data: {
    leaveSurfaceTime: number; // unix seconds, 0 = not recorded
    leaveBottomTime: number;
    reachSurfaceTime: number;
    bottomTimeMinutes: number;
    maxDepth: number; // whole units (ft or m per `units`)
    averageDepth: number; // whole units, 0 = not recorded
    mode: number; // DiveMode enum (7-mode v2 set)
    purpose: number; // DivePurpose (off-chain vocabulary)
    suit: number; // SuitType (off-chain vocabulary)
  };
  env: {
    airTemp: number;
    waterTemp: number;
    currentKnots: number;
    bottomType: number;
    coords: { latitude: number; longitude: number }; // degrees
    location: string;
    weatherConditions: string;
  };
  decomp: {
    decompType: number;
    totalDecompTimeMinutes: number;
    maxDepthAttained: number;
    tableSchedule: string; // "<TOKEN>[ <schedule>]" e.g. "USN 60/40"; "" = none
    repetitiveGroup: string; // "A"-"Z" or ""
    surfaceIntervalMinutes: number;
    newRepetitiveGroup: string; // "A"-"Z" or ""
  };
  gas: {
    gasType: number;
    o2Percent: number;
    hePercent: number;
    n2Percent: number;
    cylinderPressureIn: number;
    cylinderPressureOut: number;
    gasConsumed: number;
    bailoutPressure: number;
  };
  remarks: string;
}

/** A locally held profile: the UDDF bytes committed to by contentHash, plus
 *  the draft they were generated from (for detail rendering and re-export). */
export interface StoredProfile {
  uddf: string;
  draft: DiveDraft;
  /** Set when the (encrypted) profile has been pinned to IPFS. */
  published?: { uri: string; at: number };
}

/** Convenience: zeroed fixed-byte constants for optional header fields. */
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
export const ZERO_BYTES16 = "0x00000000000000000000000000000000" as `0x${string}`;
export const ZERO_BYTES4 = "0x00000000" as `0x${string}`;
export const ZERO_BYTES1 = "0x00" as `0x${string}`;
