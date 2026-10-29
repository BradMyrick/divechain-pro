import type { NormalizedDive } from "./diverStats";

export interface DiveGroup {
  key: string;
  label: string;
  dives: NormalizedDive[];
}

export function groupByMonth(dives: NormalizedDive[]): DiveGroup[] {
  const map = new Map<string, NormalizedDive[]>();
  for (const dive of [...dives].reverse()) {
    const date = new Date(Number(dive.diveDate) * 1000);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth()).padStart(2, "0")}`;
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
        Number(key.slice(5, 7)),
        15,
      ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      dives: group,
    }));
}
