import { describe, it, expect } from "vitest";
import { DIVE_SITES, REGIONS, siteById } from "./diveSites";
import { DIVE_SHOPS } from "./diveShops";

const SITE_TYPES = new Set<string>([
  "Reef", "Wall", "Wreck", "Cave", "Pier", "Pinnacle", "Seamount", "Sandbar", "Muck", "Kelp", "Monument", "Rock", "Thila",
]);

describe("dive site data integrity", () => {
  it("has globally unique ids", () => {
    const ids = DIVE_SITES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least 100 curated sites with a Caribbean majority", () => {
    expect(DIVE_SITES.length).toBeGreaterThanOrEqual(100);
    const caribbean = DIVE_SITES.filter((s) => s.region === "Caribbean");
    expect(caribbean.length).toBeGreaterThanOrEqual(40);
  });

  it("keeps coordinates on the planet", () => {
    for (const s of DIVE_SITES) {
      expect(s.lat, s.id).toBeGreaterThan(-90);
      expect(s.lat, s.id).toBeLessThan(90);
      expect(s.lng, s.id).toBeGreaterThanOrEqual(-180);
      expect(s.lng, s.id).toBeLessThanOrEqual(180);
      expect(Math.abs(s.lat), s.id).toBeGreaterThan(0.001);
    }
  });

  it("uses valid regions, types, ratings, and resolves timezones", () => {
    for (const s of DIVE_SITES) {
      expect(REGIONS, s.id).toContain(s.region);
      expect(s.types.length, s.id).toBeGreaterThan(0);
      for (const t of s.types as string[]) {
        expect(SITE_TYPES, `${s.id}: ${t}`).toContain(t);
      }
      expect(s.rating, s.id).toBeGreaterThanOrEqual(1);
      expect(s.rating, s.id).toBeLessThanOrEqual(5);
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: s.tz }), s.id).not.toThrow();
    }
  });

  it("resolves sites by id", () => {
    expect(siteById("silfra")?.name).toContain("Silfra");
    expect(siteById("nope")).toBeUndefined();
  });
});

describe("dive shop data integrity", () => {
  it("has unique ids, valid regions, and https websites", () => {
    const ids = DIVE_SHOPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of DIVE_SHOPS) {
      expect(REGIONS, s.id).toContain(s.region);
      expect(s.website, s.id).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
    }
  });
});
