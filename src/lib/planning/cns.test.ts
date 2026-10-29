import { describe, it, expect } from "vitest";
import { cnsSingleLimit, cnsDailyLimit, cnsPercent, cnsPercentDaily, otu, OTU_DAILY_LIMIT } from "./cns";

describe("NOAA CNS limits", () => {
  it("anchors the verified NOAA single-dive values", () => {
    expect(cnsSingleLimit(1.6)).toBe(45);
    expect(cnsSingleLimit(1.5)).toBe(120);
    expect(cnsSingleLimit(1.4)).toBe(150);
    expect(cnsSingleLimit(1.3)).toBe(180);
    expect(cnsSingleLimit(1.2)).toBe(210);
    expect(cnsSingleLimit(1.0)).toBe(300);
  });

  it("interpolates between anchors and clamps low ppO2", () => {
    expect(cnsSingleLimit(1.35)).toBeCloseTo(165);
    expect(cnsSingleLimit(0.5)).toBe(720);
  });

  it("rejects ppO2 above the table", () => {
    expect(cnsSingleLimit(1.7)).toBeUndefined();
  });

  it("uses the NOAA daily column and falls back below 1.0", () => {
    expect(cnsDailyLimit(1.4)).toBe(180);
    expect(cnsDailyLimit(1.6)).toBe(150);
    expect(cnsDailyLimit(0.9)).toBe(cnsSingleLimit(0.9));
  });
});

describe("CNS clock", () => {
  it("accumulates percent across segments", () => {
    const pct = cnsPercent([{ ppo2: 1.4, minutes: 75 }]);
    expect(pct).toBeCloseTo(50);
  });

  it("splits a dive into bottom and safety-stop segments", () => {
    const pct = cnsPercent([
      { ppo2: 1.4, minutes: 30 },
      { ppo2: 1.28, minutes: 93 },
    ]);
    expect(pct).toBeCloseTo(20 + 50, 1);
  });

  it("hits 100% at the single-dive limit", () => {
    expect(cnsPercent([{ ppo2: 1.6, minutes: 45 }])).toBeCloseTo(100);
  });

  it("counts over-limit exposure as full clock per minute", () => {
    expect(cnsPercent([{ ppo2: 1.65, minutes: 10 }])).toBe(1000);
  });

  it("tracks the 24-hour clock with the NOAA daily column", () => {
    expect(cnsPercentDaily([{ ppo2: 1.4, minutes: 90 }])).toBeCloseTo(50);
    expect(cnsPercentDaily([{ ppo2: 1.0, minutes: 300 }])).toBeCloseTo(100);
  });
});

describe("OTU (REPEX)", () => {
  it("matches the published OTU/min table within rounding", () => {
    expect(otu([{ ppo2: 1.0, minutes: 1 }])).toBeCloseTo(1.0, 2);
    expect(otu([{ ppo2: 1.5, minutes: 1 }])).toBeCloseTo(1.78, 2);
    expect(otu([{ ppo2: 1.6, minutes: 1 }])).toBeCloseTo(1.92, 2);
    expect(otu([{ ppo2: 0.7, minutes: 1 }])).toBeCloseTo(0.47, 2);
    expect(otu([{ ppo2: 0.6, minutes: 1 }])).toBeCloseTo(0.263, 2);
  });

  it("accumulates nothing at or below 0.5 ATA", () => {
    expect(otu([{ ppo2: 0.5, minutes: 60 }, { ppo2: 0.21, minutes: 60 }])).toBe(0);
  });

  it("exposes the day-1 REPEX cap", () => {
    expect(OTU_DAILY_LIMIT).toBe(850);
  });
});
