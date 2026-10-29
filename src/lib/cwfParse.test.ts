import { describe, it, expect } from "vitest";
import { expandUgc, parseZoneSegments } from "../../api/conditions";

const CWF_FIXTURE = `
000
FPUS52 KKEY 101425
CWFKEY

Coastal Waters Forecast for the Florida Keys
National Weather Service Key West FL
1025 AM EDT Thu Sep 10 2026

Gulf of America side of the lower keys-
GMZ053-110230-
Hawk Channel from Craig Key to west end of Seven Mile Bridge out
to the reef-
1025 AM EDT Thu Sep 10 2026

.TODAY...East winds 10 to 15 knots. Seas 2 to 3 feet.
.TONIGHT...East winds near 10 knots. Seas 1 to 2 feet.

$$

GMZ042>044-110230-
Hawk Channel from Ocean Reef to Craig Key out to the reef-
1025 AM EDT Thu Sep 10 2026

.THIS AFTERNOON...East to southeast winds near 10 knots. Seas 1
to 2 feet. Nearshore waters a light chop. Showers likely.
.TONIGHT...East winds increasing to 10 to 15 knots.
Seas 1 to 2 feet.
.FRIDAY...East winds near 10 knots.
.FRIDAY NIGHT...Diminishing winds.
.SATURDAY...Light winds.

$$

GMZ054-110230-
Straits of Florida-
1025 AM EDT Thu Sep 10 2026

.TODAY...Southeast winds 10 knots.

$$
`;

describe("expandUgc", () => {
  it("expands ranges, lists, and single zones", () => {
    expect(expandUgc("GMZ042>044", "GMZ")).toEqual(["GMZ042", "GMZ043", "GMZ044"]);
    expect(expandUgc("GMZ042,044", "GMZ")).toEqual(["GMZ042", "GMZ044"]);
    expect(expandUgc("GMZ042", "GMZ")).toEqual(["GMZ042"]);
    expect(expandUgc("GMZ042>044", "AMZ")).toEqual([]);
  });
});

describe("parseZoneSegments", () => {
  it("finds the right segment for a zone in a range header and parses periods", () => {
    const periods = parseZoneSegments(CWF_FIXTURE, "GMZ042");
    expect(periods).toHaveLength(4);
    expect(periods[0]).toEqual({
      name: "This Afternoon",
      text: "East to southeast winds near 10 knots. Seas 1 to 2 feet. Nearshore waters a light chop. Showers likely.",
    });
    expect(periods[1].text).toContain("Seas 1 to 2 feet.");
  });

  it("finds single-zone segments too", () => {
    const periods = parseZoneSegments(CWF_FIXTURE, "GMZ054");
    expect(periods[0].name).toBe("Today");
  });

  it("returns nothing for zones not in the product", () => {
    expect(parseZoneSegments(CWF_FIXTURE, "PZZ135")).toEqual([]);
  });

  it("handles empty products", () => {
    expect(parseZoneSegments("", "GMZ042")).toEqual([]);
  });
});
