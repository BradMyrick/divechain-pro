import type { NormalizedDive } from "./diverStats";
import { ymdToString } from "./contracts";

export interface DiveGroup {
  key: string;
  label: string;
  dives: NormalizedDive[];
}

/** Group by UTC calendar month. v2 header dates are uint32 YYYYMMDD, so the
 *  bucket key is just the leading `YYYYMM` digits. */
export function groupByMonth(dives: NormalizedDive[]): DiveGroup[] {
  const map = new Map<string, NormalizedDive[]>();
  for (const dive of [...dives].reverse()) {
    const day = ymdToString(Number(dive.diveDate));
    if (!day) continue;
    const key = day.slice(0, 7); // YYYY-MM
    const bucket = map.get(key);
    if (bucket) bucket.push(dive);
    else map.set(key, [dive]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, group]) => ({
      key,
      label: new Date(
        Number(key.slice(0, 4)),
        Number(key.slice(5, 7)) - 1,
        15,
      ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      dives: group,
    }));
}
