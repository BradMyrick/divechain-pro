/**
 * Flying / altitude ascent guidance, DAN Flying After Diving workshop (2002)
 * consensus for cabin altitudes of 2,000–8,000 ft.
 */
export type NoFlyCategory = "single" | "repetitive" | "deco";

export interface NoFlyGuidance {
  category: NoFlyCategory;
  label: string;
  minSurfaceHours: number;
  detail: string;
}

export const NO_FLY_GUIDANCE: readonly NoFlyGuidance[] = [
  {
    category: "single",
    label: "Single no-stop dive",
    minSurfaceHours: 12,
    detail: "One no-decompression dive within the last 48 hours.",
  },
  {
    category: "repetitive",
    label: "Multiple / multi-day no-stop dives",
    minSurfaceHours: 18,
    detail: "Unlimited no-decompression air or nitrox dives over multiple days.",
  },
  {
    category: "deco",
    label: "Decompression or helium dives",
    minSurfaceHours: 24,
    detail: "Substantially longer than 18 h is advised; 24 h is the suggested minimum, and longer is better.",
  },
];

export function noFlyGuidance(category: NoFlyCategory): NoFlyGuidance {
  return NO_FLY_GUIDANCE.find((g) => g.category === category) ?? NO_FLY_GUIDANCE[2];
}
