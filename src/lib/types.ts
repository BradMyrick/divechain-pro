// TS mirrors of the on-chain ERC-8260 structs (see deployment/src/interfaces/IDiveLogTypes.sol).
// Numeric fields are bigint because they cross the ABI boundary as such.

export interface Coordinates {
  latitude: number; // int32, microdegrees (e.g. 18320000 = 18.32 N)
  longitude: number; // int32, microdegrees (e.g. -149940000 = 149.94 W)
}

export interface DiveData {
  leaveSurfaceTime: number; // uint64 unix
  leaveBottomTime: number; // uint64 unix
  reachSurfaceTime: number; // uint64 unix
  bottomTimeMinutes: number; // uint32
  maxDepth: number; // uint32, positive = below surface
  averageDepth: number; // uint32, 0 = not recorded
  mode: number; // DiveMode enum
  purpose: number; // DivePurpose enum
  suit: number; // SuitType enum
}

export interface Environment {
  airTemp: number; // int32
  waterTemp: number; // int32
  currentKnots: number; // int16
  bottomType: number; // BottomType enum
  coords: Coordinates;
  location: string;
  weatherConditions: string;
}

export interface Decompression {
  decompType: number; // DecompressionType enum
  totalDecompTimeMinutes: number; // uint32
  maxDepthAttained: number; // int32
  tableSchedule: `0x${string}`; // bytes32
  repetitiveGroup: `0x${string}`; // bytes1
  surfaceIntervalMinutes: number; // uint32
  newRepetitiveGroup: `0x${string}`; // bytes1
}

export interface GasData {
  gasType: number; // BreathingGas enum
  o2Percent: number; // uint16
  hePercent: number; // uint16
  n2Percent: number; // uint16
  cylinderPressureIn: number; // uint32
  cylinderPressureOut: number; // uint32
  gasConsumed: number; // uint32
  bailoutPressure: number; // uint32
}

export interface DiveInput {
  diveDate: number; // uint64 unix (date, 00:00 UTC of dive day)
  units: number; // UnitSystem enum
  data: DiveData;
  env: Environment;
  decomp: Decompression;
  gas: GasData;
  remarks: string;
}

export interface DiveLog extends DiveInput {
  id: bigint;
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

/** Convenience: a zeroed bytes32 / bytes1 for optional fields. */
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
export const ZERO_BYTES1 = "0x00" as `0x${string}`;
