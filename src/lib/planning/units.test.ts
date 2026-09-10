import { describe, it, expect } from "vitest";
import {
  metersToFeet, feetToMeters, barToPsi, psiToBar, celsiusToF, ata,
} from "./units";

describe("units", () => {
  it("converts depth both ways", () => {
    expect(feetToMeters(33)).toBeCloseTo(10.06, 2);
    expect(metersToFeet(10)).toBeCloseTo(32.81, 2);
    expect(feetToMeters(metersToFeet(18))).toBeCloseTo(18, 9);
  });

  it("converts pressure", () => {
    expect(barToPsi(200)).toBeCloseTo(2900.75, 1);
    expect(psiToBar(barToPsi(207))).toBeCloseTo(207, 6);
  });

  it("converts temperature", () => {
    expect(celsiusToF(0)).toBe(32);
    expect(celsiusToF(28)).toBeCloseTo(82.4, 1);
  });

  it("computes atmospheres absolute", () => {
    expect(ata(0)).toBe(1);
    expect(ata(10)).toBeCloseTo(2);
    expect(ata(30)).toBeCloseTo(4);
  });
});
