export const FT_PER_M = 3.280839895;
export const M_PER_FT = 0.3048;
export const PSI_PER_BAR = 14.503773773;

export const metersToFeet = (m: number) => m * FT_PER_M;
export const feetToMeters = (ft: number) => ft * M_PER_FT;
export const barToPsi = (bar: number) => bar * PSI_PER_BAR;
export const psiToBar = (psi: number) => psi / PSI_PER_BAR;
export const celsiusToF = (c: number) => (c * 9) / 5 + 32;

/** Absolute pressure in atmospheres at a given depth in meters of seawater. */
export const ata = (depthM: number) => depthM / 10 + 1;
