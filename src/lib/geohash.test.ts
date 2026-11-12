import { describe, it, expect } from "vitest";
import { geohash, coarseGeohashBytes } from "./geohash";

describe("geohash", () => {
  it("matches the canonical public vector", () => {
    // The classic geohash example (Wikipedia): Jutland, Denmark.
    expect(geohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohash(57.64911, 10.40744, 4)).toBe("u4pr");
  });

  it("is stable across calls (deterministic cell assignment)", () => {
    const a = geohash(11.212, -60.935, 4);
    const b = geohash(11.212, -60.935, 4);
    expect(a).toBe(b);
    expect(a).toHaveLength(4);
    expect(a).toMatch(/^[0123456789bcdefghjkmnpqrstuvwxyz]{4}$/);
  });

  it("puts nearby points in the same precision-4 cell", () => {
    // ~2 km apart, same coarse region
    expect(geohash(11.212, -60.935, 4)).toBe(geohash(11.23, -60.94, 4));
  });

  it("separates distant points", () => {
    expect(geohash(11.212, -60.935, 4)).not.toBe(geohash(57.64911, 10.40744, 4));
  });

  it("clamps the poles and the date line without crashing", () => {
    expect(() => geohash(90, 180, 4)).not.toThrow();
    expect(() => geohash(-90, -180, 4)).not.toThrow();
  });
});

describe("coarseGeohashBytes", () => {
  it("encodes four ASCII chars as bytes4 hex", () => {
    const b = coarseGeohashBytes(57.64911, 10.40744);
    expect(b).toBe("0x75347072"); // "u4pr"
    expect(Buffer.from(b.slice(2), "hex").toString("ascii")).toBe("u4pr");
  });

  it("is always 4 bytes of printable ASCII", () => {
    for (const [lat, lon] of [[0, 0], [45, 9], [-33, 151], [64, -21]] as const) {
      const hex = coarseGeohashBytes(lat, lon);
      expect(hex).toMatch(/^0x[0-9a-f]{8}$/);
    }
  });
});
