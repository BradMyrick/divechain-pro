import SovereignDiveLogArtifact from "../contracts/SovereignDiveLog.json";

export const SOVEREIGN_DIVE_LOG_ABI = SovereignDiveLogArtifact.abi;
export const SOVEREIGN_DIVE_LOG_BYTECODE =
  SovereignDiveLogArtifact.bytecode as `0x${string}`;
export const SOVEREIGN_DIVE_LOG_DEPLOYED_BYTECODE =
  SovereignDiveLogArtifact.deployedBytecode as `0x${string}`;

export const UnitSystem = {
  Imperial: 0,
  Metric: 1,
} as const;
export type UnitSystem = (typeof UnitSystem)[keyof typeof UnitSystem];

export const DiveMode = {
  SSA: 0,
  SCUBA: 1,
} as const;
export type DiveMode = (typeof DiveMode)[keyof typeof DiveMode];

export const BreathingGas = {
  Air: 0,
  Nitrox: 1,
  Heliox: 2,
  Trimix: 3,
  Oxygen: 4,
  Mixed: 5,
} as const;
export type BreathingGas = (typeof BreathingGas)[keyof typeof BreathingGas];

export const BiologicalSex = {
  Male: 0,
  Female: 1,
  Unspecified: 2,
} as const;
export type BiologicalSex = (typeof BiologicalSex)[keyof typeof BiologicalSex];

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
  [DiveMode.SSA]: "SSA",
  [DiveMode.SCUBA]: "SCUBA",
};

export const BREATHING_GAS_LABELS: Record<number, string> = {
  [BreathingGas.Air]: "Air",
  [BreathingGas.Nitrox]: "Nitrox",
  [BreathingGas.Heliox]: "Heliox",
  [BreathingGas.Trimix]: "Trimix",
  [BreathingGas.Oxygen]: "Oxygen",
  [BreathingGas.Mixed]: "Mixed",
};

export const BIOLOGICAL_SEX_LABELS: Record<number, string> = {
  [BiologicalSex.Male]: "Male",
  [BiologicalSex.Female]: "Female",
  [BiologicalSex.Unspecified]: "Unspecified",
};

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

export const DECOMP_TYPE_LABELS: Record<number, string> = {
  [DecompressionType.NoneDecomp]: "None",
  [DecompressionType.Standard]: "Standard",
  [DecompressionType.SurfaceDecompO2]: "Surface Decomp O2",
  [DecompressionType.SurfaceDecompAir]: "Surface Decomp Air",
  [DecompressionType.Saturation]: "Saturation",
  [DecompressionType.Repetitive]: "Repetitive",
  [DecompressionType.ExceptionalExposure]: "Exceptional Exposure",
};
