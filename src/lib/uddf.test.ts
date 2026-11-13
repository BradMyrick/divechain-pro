import { describe, it, expect } from "vitest";
import { uddfFromDraft, sha256Hex, draftTiming, noonUtc } from "./uddf";
import { diveFormToDraft, draftToDiveForm, emptyDiveFormState, prepareDiveInput, draftToHeader } from "./diveForm";
import { DiveMode, UnitSystem, strToBytes16, stringToYmd, ymdOfUnix } from "./contracts";
import { ZERO_BYTES16, ZERO_BYTES4 } from "./types";
import type { DiveFormState } from "./diveForm";

const baseForm = (): DiveFormState => ({
  ...emptyDiveFormState(),
  diveDate: "2026-05-14",
  maxDepth: 58,
  averageDepth: 32,
  bottomTimeMinutes: 41,
  mode: DiveMode.OCRecreational,
  location: "Buccoo Reef, Tobago",
  lat: "11.212",
  lon: "-60.935",
  waterTemp: 82,
  remarks: "Turtle at the coral head",
});

describe("diveFormToDraft / draftToDiveForm", () => {
  it("round-trips every form value through the draft", () => {
    const s = baseForm();
    s.units = UnitSystem.Imperial;
    s.mode = DiveMode.SurfaceSupplied;
    s.tableSchedule = "USN 60/40";
    const draft = diveFormToDraft(s);
    const back = draftToDiveForm(draft);
    expect(back.units).toBe(UnitSystem.Imperial);
    expect(back.mode).toBe(DiveMode.SurfaceSupplied);
    expect(back.maxDepth).toBe(58);
    expect(back.bottomTimeMinutes).toBe(41);
    expect(back.location).toBe("Buccoo Reef, Tobago");
    expect(back.tableSchedule).toBe("USN 60/40");
    expect(back.remarks).toBe("Turtle at the coral head");
    // re-deriving the draft reproduces the identical record
    expect(diveFormToDraft(back)).toEqual(draft);
  });

  it("keeps optional times at 0 when blank and derives n2/consumed", () => {
    const s = baseForm();
    s.o2Percent = 32;
    s.cylIn = 3000;
    s.cylOut = 1200;
    const draft = diveFormToDraft(s);
    expect(draft.data.leaveSurfaceTime).toBe(0);
    expect(draft.gas.n2Percent).toBe(68);
    expect(draft.gas.gasConsumed).toBe(1800);
  });
});

describe("draftTiming (v2 header timing derivation)", () => {
  it("uses wall clock when all times are present", () => {
    const s = baseForm();
    s.leaveSurface = "2026-05-14T09:20";
    s.leaveBottom = "2026-05-14T09:48";
    s.reachSurface = "2026-05-14T10:01";
    const t = draftTiming(diveFormToDraft(s));
    expect(t.durationSeconds).toBe(41 * 60);
    expect(t.bottomTimeSeconds).toBe(28 * 60);
  });

  it("falls back to bottom time + deco with a noon-UTC start", () => {
    const s = baseForm();
    s.totalDecompTime = 6;
    const t = draftTiming(diveFormToDraft(s));
    expect(t.startTime).toBe(noonUtc("2026-05-14"));
    expect(t.durationSeconds).toBe((41 + 6) * 60);
    expect(t.bottomTimeSeconds).toBe(41 * 60);
  });

  it("records bottom time 0 when only a single time figure exists", () => {
    const s = baseForm();
    const t = draftTiming(diveFormToDraft(s));
    expect(t.durationSeconds).toBe(41 * 60);
    expect(t.bottomTimeSeconds).toBe(0);
  });
});

describe("draftToHeader (v2 packed encoding)", () => {
  it("encodes the date as YYYYMMDD matching startTime's UTC day", () => {
    const s = baseForm();
    s.leaveSurface = "2026-05-14T23:30"; // late local -> any UTC day is fine, must match itself
    const h = draftToHeader(diveFormToDraft(s));
    expect(h.diveDate).toBe(ymdOfUnix(h.startTime));
  });

  it("encodes depth in tenths and gas in basis points", () => {
    const s = baseForm();
    s.units = UnitSystem.Metric;
    s.maxDepth = 18.5;
    s.o2Percent = 32;
    const h = draftToHeader(diveFormToDraft(s));
    expect(h.maxDepth).toBe(185);
    expect(h.o2Bps).toBe(3200);
    expect(h.heBps).toBe(0);
  });

  it("encodes 0/0 gas for freedives", () => {
    const s = baseForm();
    s.mode = DiveMode.Freedive;
    s.o2Percent = 0;
    s.hePercent = 0;
    const h = draftToHeader(diveFormToDraft(s));
    expect(h.o2Bps).toBe(0);
    expect(h.heBps).toBe(0);
  });

  it("encodes the table schedule to bytes16, empty stays zero", () => {
    const s = baseForm();
    s.tableSchedule = "  USN 60/40 ";
    const withSchedule = draftToHeader(diveFormToDraft(s));
    expect(withSchedule.tableSchedule).toBe(strToBytes16("USN 60/40"));

    s.tableSchedule = "";
    expect(draftToHeader(diveFormToDraft(s)).tableSchedule).toBe(ZERO_BYTES16);
  });

  it("encodes the coarse geohash from coordinates, zero without them", () => {
    const withCoords = draftToHeader(diveFormToDraft(baseForm()));
    expect(withCoords.coarseGeohash).not.toBe(ZERO_BYTES4);
    expect(withCoords.coarseGeohash).toMatch(/^0x[0-9a-f]{8}$/);

    const s = baseForm();
    s.lat = "";
    s.lon = "";
    expect(draftToHeader(diveFormToDraft(s)).coarseGeohash).toBe(ZERO_BYTES4);
  });
});

describe("UDDF writer", () => {
  it("is deterministic: same draft, byte-identical output", () => {
    const draft = diveFormToDraft(baseForm());
    expect(uddfFromDraft(draft)).toBe(uddfFromDraft(diveFormToDraft(baseForm())));
  });

  it("changes when any input changes (the hash is a real commitment)", () => {
    const a = uddfFromDraft(diveFormToDraft(baseForm()));
    const s = baseForm();
    s.remarks = "different dive";
    expect(uddfFromDraft(diveFormToDraft(s))).not.toBe(a);
  });

  it("carries no personal data and no clock reads", () => {
    const xml = uddfFromDraft(diveFormToDraft(baseForm()));
    expect(xml).not.toContain("<personal>");
    expect(xml).not.toContain("<firstname>");
    expect(xml).not.toContain("<lastname>");
    expect(xml).not.toContain("<birthdate>");
    // header date only - no Date.now() drift is possible because the output
    // is a pure function of the draft (covered by the determinism tests).
  });

  it("mirrors planning fields per the ERC publisher rule", () => {
    const s = baseForm();
    s.tableSchedule = "USN 60/40";
    s.totalDecompTime = 6;
    const xml = uddfFromDraft(diveFormToDraft(s));
    expect(xml).toContain("US-Navy");
    expect(xml).toContain("table=USN 60/40");
    expect(xml).toContain("greatestdepth");
    expect(xml).toContain("diveduration");
  });

  it("escapes XML reserved characters in free text", () => {
    const s = baseForm();
    s.remarks = 'saw a <big> "fish" & a ray';
    const xml = uddfFromDraft(diveFormToDraft(s));
    expect(xml).toContain("&lt;big&gt;");
    expect(xml).toContain("&quot;fish&quot;");
    expect(xml).toContain("&amp; a ray");
  });
});

describe("sha256Hex", () => {
  it("matches the FIPS 180-4 test vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("prepareDiveInput binds the header to the exact UDDF bytes", async () => {
    const p = await prepareDiveInput(diveFormToDraft(baseForm()));
    expect(p.input.contentHash).toBe(await sha256Hex(p.uddf));
    expect(p.input.contentHash).not.toBe("0x" + "0".repeat(64));
    expect(p.input.diveDate).toBe(stringToYmd("2026-05-14"));
  });
});
