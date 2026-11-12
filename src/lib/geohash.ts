// Geohash encoding for the ERC-8260 v2 `coarseGeohash` header field.
//
// The on-chain field stores precision 4 (four base32 characters, roughly a
// 39 km x 19 km cell): a privacy-safe region, never a pinpoint. Precise
// coordinates, when recorded at all, live only in the off-chain UDDF profile.

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash (even bits = longitude, odd bits = latitude). */
export function geohash(lat: number, lon: number, precision: number): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = "";
  let bits = 0;
  let bit = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon > mid) {
        bit = (bit << 1) | 1;
        lonMin = mid;
      } else {
        bit <<= 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        bit = (bit << 1) | 1;
        latMin = mid;
      } else {
        bit <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    if (++bits === 5) {
      hash += BASE32[bit & 31];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

/** The on-chain `coarseGeohash` bytes4: four ASCII chars, right-padded with
 *  NULs if fewer are requested. bytes4(0) means not recorded. */
export function coarseGeohashBytes(lat: number, lon: number): `0x${string}` {
  const chars = geohash(lat, lon, 4);
  let hex = "0x";
  for (let i = 0; i < 4; i++) {
    const code = i < chars.length ? chars.charCodeAt(i) : 0;
    hex += code.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}
