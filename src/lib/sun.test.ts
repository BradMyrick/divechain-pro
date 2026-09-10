import { describe, it, expect } from "vitest";
import { sunTimes, formatInZone } from "./sun";

const minutesOfDay = (d: Date) =>
  d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;

describe("sunTimes", () => {
  it("gives ~06:00 sunrise at the equator on the March equinox", () => {
    const t = sunTimes(new Date(Date.UTC(2026, 2, 20, 12)), 0, 0);
    expect(t.polar).toBeNull();
    expect(t.sunriseUtc).toBeDefined();
    expect(minutesOfDay(t.sunriseUtc!)).toBeGreaterThan(5 * 60 + 40);
    expect(minutesOfDay(t.sunriseUtc!)).toBeLessThan(6 * 60 + 20);
    expect(minutesOfDay(t.sunsetUtc!)).toBeGreaterThan(17 * 60 + 40);
    expect(minutesOfDay(t.sunsetUtc!)).toBeLessThan(18 * 60 + 20);
    expect(minutesOfDay(t.solarNoonUtc)).toBeGreaterThan(705);
    expect(minutesOfDay(t.solarNoonUtc)).toBeLessThan(735);
  });

  it("shifts solar noon with longitude", () => {
    const t = sunTimes(new Date(Date.UTC(2026, 5, 21, 0)), 12.15, -68.28);
    expect(minutesOfDay(t.solarNoonUtc)).toBeCloseTo(720 + 68.28 * 4, -1);
  });

  it("makes days long at the summer solstice in the north", () => {
    const t = sunTimes(new Date(Date.UTC(2026, 5, 21, 0)), 58.9, -3.05);
    const dayMinutes =
      (t.sunsetUtc!.getTime() - t.sunriseUtc!.getTime()) / 60000;
    expect(dayMinutes).toBeGreaterThan(17 * 60);
    expect(dayMinutes).toBeLessThan(19 * 60);
  });

  it("reports polar night and polar day", () => {
    const night = sunTimes(new Date(Date.UTC(2026, 11, 21, 0)), 78.2, 15.6);
    expect(night.polar).toBe("night");
    const day = sunTimes(new Date(Date.UTC(2026, 5, 21, 0)), 78.2, 15.6);
    expect(day.polar).toBe("day");
  });

  it("formats in the site timezone", () => {
    const t = sunTimes(new Date(Date.UTC(2026, 2, 20, 12)), 12.15, -68.28);
    const label = formatInZone(t.solarNoonUtc, "America/Curacao");
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });
});
