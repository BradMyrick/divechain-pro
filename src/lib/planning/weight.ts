export type SuitKey = "swim" | "shorty" | "w3" | "w5" | "w7" | "dry";
export type WaterKey = "salt" | "fresh";
export type TankKey = "al63" | "al80" | "al100" | "hp100" | "lp85" | "s12" | "s15" | "al40";

/**
 * Rough planning figures, positive = buoyant lift the exposure suit or empty
 * cylinder adds (pounds, seawater). Always confirm in a buoyancy check.
 */
export const SUIT_LIFT_LB: Record<SuitKey, number> = {
  swim: 2,
  shorty: 5,
  w3: 10,
  w5: 15,
  w7: 22,
  dry: 30,
};

export const SUIT_LABELS: Record<SuitKey, string> = {
  swim: "Swimsuit / rash guard",
  shorty: "Shorty wetsuit",
  w3: "3 mm full suit",
  w5: "5 mm full suit",
  w7: "7 mm full suit + hood",
  dry: "Drysuit + light undies",
};

/** End-of-dive (near-empty) cylinder buoyancy in seawater, pounds. */
export const TANK_BUOYANCY_LB: Record<TankKey, number> = {
  al63: 2.0,
  al80: 4.4,
  al100: 5.0,
  hp100: -1.0,
  lp85: -1.5,
  s12: -2.0,
  s15: -3.0,
  al40: 2.0,
};

export const TANK_LABELS: Record<TankKey, string> = {
  al63: "AL63",
  al80: "AL80",
  al100: "AL100",
  hp100: "Steel HP100",
  lp85: "Steel LP85",
  s12: "Steel 12 L",
  s15: "Steel 15 L",
  al40: "AL40 (stage/deco)",
};

export interface WeightEstimateInput {
  suit: SuitKey;
  tank: TankKey;
  water: WaterKey;
}

export interface WeightEstimate {
  leadLb: number;
  leadKg: number;
  breakdown: { label: string; lb: number }[];
}

/** Lead needed to hold a 5 m safety stop near empty: suit lift + tank swing, adjusted for water. */
export function estimateWeight(input: WeightEstimateInput): WeightEstimate {
  const suit = SUIT_LIFT_LB[input.suit];
  const tank = TANK_BUOYANCY_LB[input.tank];
  const freshAdjustment = input.water === "fresh" ? -4 : 0;

  const lead = Math.max(0, suit + tank + freshAdjustment);
  return {
    leadLb: lead,
    leadKg: lead * 0.45359237,
    breakdown: [
      { label: SUIT_LABELS[input.suit], lb: suit },
      { label: `${TANK_LABELS[input.tank]} near-empty`, lb: tank },
      ...(freshAdjustment ? [{ label: "Fresh water is less dense", lb: freshAdjustment }] : []),
    ],
  };
}
