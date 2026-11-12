import { describe, it, expect } from "vitest";
import {
  parseDiveFile,
  ImportError,
  validateDiveDraft,
  dedupKeyOfDraft,
  dedupFieldsOfDraft,
  buildChainIndex,
  analyzeRows,
  chunkInputs,
  noonUtc,
  DIVES_PER_TX,
  type ParsedRow,
} from "./batchImport";
import type { DiveDraft, DiveHeader } from "./types";
import {
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  BreathingGas,
  DecompressionType,
  depthToTenths,
  stringToYmd,
} from "./contracts";
import { draftToHeader } from "./diveForm";
import { diveToStandardJson, divesToBatchJson } from "./batchExport";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Order-insensitive deep compare via sorted-key JSON. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)));
    }
    return val;
  });

const parsed = (rows: ParsedRow[]): DiveDraft[] => rows.map((r) => r.input);

describe("noonUtc (the default startTime convention)", () => {
  it("stores date-only records at 12:00 UTC so every timezone renders the same day", () => {
    expect(noonUtc("2014-02-21")).toBe(1392984000); // 2014-02-21T12:00:00Z
    expect(new Date(noonUtc("2014-02-21") * 1000).toISOString()).toBe("2014-02-21T12:00:00.000Z");
  });

  it("returns 0 for junk", () => {
    expect(noonUtc("not a date")).toBe(0);
    expect(noonUtc("")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// evidence-core mapping - parity with divechain-batch-logger gen_batches.py
// ---------------------------------------------------------------------------

const EVIDENCE_TWO_SAME_DAY = {
  commercial_dive_logs: [
    {
      date: "2014-02-21",
      job_number: "14-90-918",
      customer: "Shell Chemical / Marathon Petroleum",
      location: "Norco / Garyville River Terminal, Mississippi River, Louisiana",
      personnel: { diver: "B. Myrick", tender: "E. Salo", supervisor: "H. Zimmerman" },
      dive_times: {
        left_surface_ls: "10:10",
        reached_bottom_rb: "10:12",
        left_bottom_lb: "12:11",
        reached_surface_rs: "13:45",
        bottom_time_minutes: 119.0,
        total_time_minutes: 215.0,
      },
      decompression_table: { leave_bottom_schedule: "60/120" },
      depth: { max_depth_raw: "57 ft" },
      operations: {
        objective: "SHIP IMPACT FENDER PILE RIGGING & TIMBER REPLACEMENT",
        work_completed: "RIGGED DAMAGED STEEL H-PILE AND BOLTED OAK RUB STRIP",
        remarks: "ZERO VISIBILITY - TACTILE ONLY; single LA mill campaign",
      },
      log_id: 1,
    },
    {
      date: "2014-02-21",
      job_number: "14-20-834",
      location: "Norco / Garyville River Terminal, Mississippi River, Louisiana",
      dive_times: {
        left_surface_ls: "14:05",
        reached_bottom_rb: "14:07",
        left_bottom_lb: "16:03",
        reached_surface_rs: "17:37",
        bottom_time_minutes: 116.0,
        total_time_minutes: 212.0,
      },
      decompression_table: { leave_bottom_schedule: "60/120" },
      depth: { max_depth_raw: "57 ft" },
      operations: {
        objective: "COOLING WATER INTAKE STRAINER DESANDING",
        work_completed: "AIRLIFT DREDGING COMPLETED IN 4 KNOT CURRENT",
        remarks: "DIVER OK",
      },
      log_id: 2,
    },
    {
      date: "2014-03-05",
      job_number: "14-10-927",
      location: "Norco / Garyville River Terminal, Mississippi River, Louisiana",
      dive_times: {
        left_surface_ls: "08:00",
        left_bottom_lb: "10:02",
        reached_surface_rs: "11:36",
        bottom_time_minutes: 120.0,
        total_time_minutes: 216.0,
      },
      decompression_table: { leave_bottom_schedule: "UNLIMITED" },
      depth: { max_depth_raw: "60 ft" },
      operations: { objective: "HULL INSPECTION", work_completed: "INSPECTED", remarks: "" },
      log_id: 3,
    },
  ],
};

describe("evidence-core mapping (gen_batches.py parity)", () => {
  const result = parseDiveFile(JSON.stringify(EVIDENCE_TWO_SAME_DAY));
  const rows = parsed(result.rows);

  it("detects the format", () => {
    expect(result.format).toBe("evidence-core");
    expect(result.rows).toHaveLength(3);
  });

  it("maps dive #1 exactly as the Foundry generator did (UTC, Imperial, surface-supplied, dry)", () => {
    const d = rows[0];
    expect(d.diveDate).toBe("2014-02-21");
    expect(d.units).toBe(UnitSystem.Imperial);
    expect(d.data.leaveSurfaceTime).toBe(1392977400); // 10:10 UTC
    expect(d.data.leaveBottomTime).toBe(1392984660); // 12:11 UTC
    expect(d.data.reachSurfaceTime).toBe(1392990300); // 13:45 UTC
    expect(d.data.bottomTimeMinutes).toBe(119);
    expect(d.data.maxDepth).toBe(57);
    expect(d.data.averageDepth).toBe(57);
    expect(d.data.mode).toBe(DiveMode.SurfaceSupplied);
    expect(d.data.purpose).toBe(DivePurpose.Repair); // "...TIMBER REPLACEMENT"
    expect(d.data.suit).toBe(SuitType.Dry);
    expect(d.env.location).toBe("Norco / Garyville River Terminal, Mississippi River, Louisiana");
    expect(d.env.bottomType).toBe(BottomType.Other);
    expect(d.decomp.decompType).toBe(DecompressionType.Standard); // "60/120"
    expect(d.decomp.tableSchedule).toBe("USN 60/120"); // tokenized for the v2 header
    expect(d.decomp.totalDecompTimeMinutes).toBe(96); // 215 - 119
    expect(d.decomp.maxDepthAttained).toBe(57);
    expect(d.decomp.surfaceIntervalMinutes).toBe(0); // first dive of the day
    expect(d.gas).toEqual({
      gasType: BreathingGas.Air, o2Percent: 21, hePercent: 0, n2Percent: 79,
      cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
    });
    expect(d.remarks).toBe(
      "SHIP IMPACT FENDER PILE RIGGING & TIMBER REPLACEMENT | " +
        "RIGGED DAMAGED STEEL H-PILE AND BOLTED OAK RUB STRIP | " +
        "JOB 14-90-918 | ZERO VISIBILITY - TACTILE ONLY; single LA mill campaign",
    );
  });

  it("computes surface interval from the previous same-day dive (UTC)", () => {
    expect(rows[1].decomp.surfaceIntervalMinutes).toBe(20); // 13:45 -> 14:05
    expect(rows[1].data.leaveSurfaceTime).toBe(1392991500); // 14:05 UTC
    expect(rows[1].data.purpose).toBe(DivePurpose.Other); // "DESANDING" hits no keyword
    expect(rows[1].data.bottomTimeMinutes).toBe(116);
    expect(rows[1].decomp.totalDecompTimeMinutes).toBe(96); // 212 - 116
  });

  it("resets the surface interval on a new day and maps UNLIMITED/INSPECT", () => {
    expect(rows[2].decomp.surfaceIntervalMinutes).toBe(0);
    expect(rows[2].decomp.decompType).toBe(DecompressionType.NoneDecomp); // UNLIMITED
    expect(rows[2].decomp.tableSchedule).toBe("USN"); // table used, no schedule
    expect(rows[2].data.purpose).toBe(DivePurpose.Inspection); // "HULL INSPECTION"
    expect(rows[2].data.maxDepth).toBe(60);
  });

  it("maps 190/* schedules to surface decompression on O2 (Perry chamber)", () => {
    const doc = {
      commercial_dive_logs: [{
        date: "2015-01-10",
        dive_times: { left_surface_ls: "08:00", left_bottom_lb: "09:00", reached_surface_rs: "11:00", bottom_time_minutes: 60, total_time_minutes: 180 },
        decompression_table: { leave_bottom_schedule: "190/140" },
        depth: { max_depth_raw: "80 ft" },
        operations: { objective: "CHAIN REPLACEMENT" },
      }],
    };
    const rows2 = parsed(parseDiveFile(JSON.stringify(doc)).rows);
    expect(rows2[0].decomp.decompType).toBe(DecompressionType.SurfaceDecompO2);
    expect(rows2[0].data.purpose).toBe(DivePurpose.Repair); // CHAIN keyword
  });

  it("warns when a depth string looks metric but the mapping is Imperial", () => {
    const doc = {
      commercial_dive_logs: [{
        date: "2015-01-10",
        dive_times: { bottom_time_minutes: 30, total_time_minutes: 40 },
        depth: { max_depth_raw: "18 m" },
        operations: { objective: "INSPECTION" },
      }],
    };
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.rows[0].warnings.some((w) => w.includes("metric"))).toBe(true);
    expect(res.rows[0].input.data.maxDepth).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// Divechain Batch JSON (the public standard)
// ---------------------------------------------------------------------------

describe("Divechain Batch JSON parsing", () => {
  it("parses a bare array with enum names, clock times and defaults (v1 aliases map)", () => {
    const doc = [{
      date: "2024-07-01",
      units: "metric",
      mode: "scuba", // v1 alias -> OC recreational
      purpose: "recreational",
      maxDepth: 18,
      bottomTimeMinutes: 47,
      times: { leftSurface: "09:15", reachedSurface: "10:02" },
      environment: { location: "Blue Hole, Belize", waterTemp: 28 },
      remarks: "First dive of the trip",
    }];
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.format).toBe("divechain-json");
    const d = res.rows[0].input;
    expect(d.diveDate).toBe("2024-07-01");
    expect(d.units).toBe(UnitSystem.Metric);
    expect(d.data.mode).toBe(DiveMode.OCRecreational);
    expect(d.data.purpose).toBe(DivePurpose.Recreational);
    expect(d.data.maxDepth).toBe(18);
    expect(d.data.averageDepth).toBe(18); // defaults to max
    expect(d.data.leaveSurfaceTime).toBe(Date.UTC(2024, 6, 1, 9, 15) / 1000); // UTC clock
    expect(d.data.leaveBottomTime).toBe(0); // absent -> 0
    expect(d.env.location).toBe("Blue Hole, Belize");
    expect(d.env.waterTemp).toBe(28);
    expect(d.env.coords).toEqual({ latitude: 0, longitude: 0 });
    expect(d.gas.o2Percent).toBe(21); // default air
    expect(d.gas.n2Percent).toBe(79);
    expect(d.decomp.decompType).toBe(DecompressionType.NoneDecomp);
  });

  it("accepts the export wrapper and full ISO times with offsets", () => {
    const doc = {
      format: "divechain-batch-json",
      version: 2,
      exportedAt: "2026-11-12T00:00:00Z",
      dives: [{
        date: "2014-02-21",
        times: { leftSurface: "2014-02-21T10:10:00Z", leftBottom: "2014-02-21T07:11:00-05:00", reachedSurface: "2014-02-21T13:45:00Z" },
        maxDepth: 57,
        bottomTimeMinutes: 119,
      }],
    };
    const d = parseDiveFile(JSON.stringify(doc)).rows[0].input;
    expect(d.data.leaveSurfaceTime).toBe(1392977400);
    expect(d.data.leaveBottomTime).toBe(1392984660); // -05:00 offset normalizes to 12:11 UTC
    expect(d.data.reachSurfaceTime).toBe(1392990300);
  });

  it("accepts the v2 mode tokens and maps legacy aliases", () => {
    const doc = [
      { date: "2020-01-01", mode: "ccr", maxDepth: 40, bottomTimeMinutes: 30 },
      { date: "2020-01-02", mode: "ssa", maxDepth: 30, bottomTimeMinutes: 40 },
      { date: "2020-01-03", mode: "freedive", maxDepth: 15, bottomTimeMinutes: 2 },
    ];
    const rows = parsed(parseDiveFile(JSON.stringify(doc)).rows);
    expect(rows[0].data.mode).toBe(DiveMode.CCR);
    expect(rows[1].data.mode).toBe(DiveMode.SurfaceSupplied);
    expect(rows[2].data.mode).toBe(DiveMode.Freedive);
  });

  it("accepts enum numbers, label strings and canonical names", () => {
    const doc = [{
      date: "2020-01-01", units: 1, mode: "surface supplied", purpose: "Surface Decompression O2" as unknown,
      suit: "hot-water", maxDepth: 10, bottomTimeMinutes: 30,
      gas: { type: "oxygen" }, deco: { type: "saturation" },
      environment: { bottomType: "coral" },
    }];
    const res = parseDiveFile(JSON.stringify(doc));
    const d = res.rows[0].input;
    expect(d.units).toBe(UnitSystem.Metric);
    expect(d.data.mode).toBe(DiveMode.SurfaceSupplied);
    expect(d.data.purpose).toBe(DivePurpose.Recreational); // a deco label is not a purpose -> site default + warning
    expect(res.rows[0].warnings.join(" ")).toContain("purpose");
    expect(d.data.suit).toBe(SuitType.HotWater);
    expect(d.gas.gasType).toBe(BreathingGas.Oxygen);
    expect(d.decomp.decompType).toBe(DecompressionType.Saturation);
    expect(d.env.bottomType).toBe(BottomType.Coral);
  });

  it("flags unrecognized enum values instead of failing silently", () => {
    const doc = [{ date: "2020-01-01", mode: "rebreather", maxDepth: 10, bottomTimeMinutes: 30 }];
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.rows[0].input.data.mode).toBe(DiveMode.OCRecreational);
    expect(res.rows[0].warnings.join(" ")).toContain("rebreather");
  });

  it("falls through to the heuristic parser when rows do not look standard", () => {
    const doc = { logs: [{ dive_date: "2021-06-01", max_depth: "30 ft", duration: 40, site: "USS Spiegel Grove" }] };
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.format).toBe("heuristic-json");
  });
});

// ---------------------------------------------------------------------------
// heuristic parser
// ---------------------------------------------------------------------------

describe("heuristic JSON sniffing", () => {
  it("maps generic field aliases and infers Imperial from ft suffixes", () => {
    const doc = {
      records: [
        { dive_date: "2021-06-01", max_depth: "30 ft", duration: 40, site: "USS Spiegel Grove", notes: "wreck dive" },
        { dive_date: "2021-06-02", max_depth: "48 ft", duration: 55, site: "Molasses Reef" },
      ],
    };
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.format).toBe("heuristic-json");
    const rows = parsed(res.rows);
    expect(rows[0].diveDate).toBe("2021-06-01");
    expect(rows[0].units).toBe(UnitSystem.Imperial);
    expect(rows[0].data.maxDepth).toBe(30);
    expect(rows[0].data.bottomTimeMinutes).toBe(40);
    expect(rows[0].env.location).toBe("USS Spiegel Grove");
    expect(rows[0].remarks).toBe("wreck dive");
    expect(rows[1].data.maxDepth).toBe(48);
  });

  it("prefers friendly array names (dives/logs/records) over random arrays", () => {
    const doc = { buddies: [{ name: "A" }, { name: "B" }], dives: [{ date: "2022-01-01", maxDepth: 5, bottomTimeMinutes: 20 }] };
    const rows = parsed(parseDiveFile(JSON.stringify(doc)).rows);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.maxDepth).toBe(5);
  });

  it("maps nested dive_times aliases from the repair format shape", () => {
    const doc = [{ date: "2019-05-04", depth: { max_depth_raw: "65 ft" }, dive_times: { left_surface_ls: "08:30", left_bottom_lb: "09:10", reached_surface_rs: "10:00", bottom_time_minutes: 40, total_time_minutes: 90 } }];
    const d = parsed(parseDiveFile(JSON.stringify(doc)).rows)[0];
    expect(d.data.leaveSurfaceTime).toBe(Date.UTC(2019, 4, 4, 8, 30) / 1000);
    expect(d.data.leaveBottomTime).toBe(Date.UTC(2019, 4, 4, 9, 10) / 1000);
    expect(d.data.reachSurfaceTime).toBe(Date.UTC(2019, 4, 4, 10, 0) / 1000);
    expect(d.data.bottomTimeMinutes).toBe(40);
    expect(d.data.maxDepth).toBe(65);
  });

  it("marks rows missing required fields for manual completion, not silently", () => {
    const doc = { dives: [{ date: "2020-01-01" }, { date: "2020-01-02", maxDepth: 9, bottomTimeMinutes: 30 }] };
    const res = parseDiveFile(JSON.stringify(doc));
    expect(res.rows[0].warnings.join(" ")).toContain("depth");
    expect(res.rows[0].warnings.join(" ")).toContain("bottom time");
    expect(res.rows[1].warnings).toHaveLength(0);
  });

  it("throws ImportError when nothing looks like dives", () => {
    expect(() => parseDiveFile("{\"a\":1}")).toThrow(ImportError);
    expect(() => parseDiveFile("not json")).toThrow(ImportError);
  });
});

// ---------------------------------------------------------------------------
// validation - mirrors the contract guards (SPEC-6 / PAPER-IX)
// ---------------------------------------------------------------------------

const validDraft = (): DiveDraft => ({
  diveDate: "2015-06-15",
  units: UnitSystem.Imperial,
  data: {
    leaveSurfaceTime: 1434367200, leaveBottomTime: 1434370800, reachSurfaceTime: 1434373200,
    bottomTimeMinutes: 60, maxDepth: 55, averageDepth: 40,
    mode: DiveMode.SurfaceSupplied, purpose: DivePurpose.Inspection, suit: SuitType.Dry,
  },
  env: {
    airTemp: 80, waterTemp: 65, currentKnots: 1, bottomType: BottomType.Rock,
    coords: { latitude: 29.95, longitude: -90.1 },
    location: "Test site", weatherConditions: "Clear",
  },
  decomp: {
    decompType: DecompressionType.Standard, totalDecompTimeMinutes: 20, maxDepthAttained: 55,
    tableSchedule: "USN 60/120", repetitiveGroup: "",
    surfaceIntervalMinutes: 45, newRepetitiveGroup: "",
  },
  gas: {
    gasType: BreathingGas.Air, o2Percent: 21, hePercent: 0, n2Percent: 79,
    cylinderPressureIn: 3000, cylinderPressureOut: 1200, gasConsumed: 1800, bailoutPressure: 0,
  },
  remarks: "test dive",
});

describe("validateDiveDraft", () => {
  it("accepts a valid record", () => {
    expect(validateDiveDraft(validDraft())).toEqual([]);
  });

  it("rejects exactly what the contract would revert on", () => {
    const zeroDepth = validDraft();
    zeroDepth.data.maxDepth = 0;
    expect(validateDiveDraft(zeroDepth).join(" ")).toContain("depth");

    const zeroBt = validDraft();
    zeroBt.data.bottomTimeMinutes = 0;
    expect(validateDiveDraft(zeroBt).join(" ")).toContain("Bottom time");

    const noDate = validDraft();
    noDate.diveDate = "";
    expect(validateDiveDraft(noDate).join(" ")).toContain("date");

    const pre1970 = validDraft();
    pre1970.diveDate = "1969-12-31";
    expect(validateDiveDraft(pre1970).join(" ")).toContain("1970");
  });

  it("rejects future dates - you cannot log a dive that has not happened", () => {
    const future = validDraft();
    future.diveDate = "2999-01-01";
    expect(validateDiveDraft(future).join(" ")).toContain("future");
  });

  it("enforces the v2 table schedule rules", () => {
    const unknownToken = validDraft();
    unknownToken.decomp.tableSchedule = "60/120"; // missing token
    expect(validateDiveDraft(unknownToken).join(" ")).toContain("known token");

    const tooLong = validDraft();
    tooLong.decomp.tableSchedule = "USN 60/120-extra1"; // 17 chars, single schedule
    expect(validateDiveDraft(tooLong).join(" ")).toContain("16 characters");
  });

  it("enforces the repetitive-group cross-field rules", () => {
    const letterWithoutTable = validDraft();
    letterWithoutTable.decomp.tableSchedule = "";
    letterWithoutTable.decomp.repetitiveGroup = "F";
    expect(validateDiveDraft(letterWithoutTable).join(" ")).toContain("requires a table schedule");

    const afterSiWithoutInterval = validDraft();
    afterSiWithoutInterval.decomp.newRepetitiveGroup = "D";
    afterSiWithoutInterval.decomp.surfaceIntervalMinutes = 0;
    expect(validateDiveDraft(afterSiWithoutInterval).join(" ")).toContain("surface interval");

    const badLetter = validDraft();
    badLetter.decomp.repetitiveGroup = "5";
    expect(validateDiveDraft(badLetter).join(" ")).toContain("single letter");
  });

  it("flags sanity problems that would still encode", () => {
    const badGas = validDraft();
    badGas.gas.o2Percent = 80;
    badGas.gas.hePercent = 40; // 120 > 100
    expect(validateDiveDraft(badGas).join(" ")).toContain("100%");

    const longBt = validDraft();
    longBt.data.bottomTimeMinutes = 1500; // > 24h
    expect(validateDiveDraft(longBt).join(" ")).toContain("24 h");

    const absurdDepth = validDraft();
    absurdDepth.data.maxDepth = 5000; // 5000 ft is not a thing
    expect(validateDiveDraft(absurdDepth).join(" ")).toContain("beyond any recorded dive");

    const timesInverted = validDraft();
    timesInverted.data.reachSurfaceTime = timesInverted.data.leaveSurfaceTime - 60;
    expect(validateDiveDraft(timesInverted).join(" ")).toContain("after the leave-surface");
  });
});

// ---------------------------------------------------------------------------
// dedup & analysis
// ---------------------------------------------------------------------------

describe("dedup key", () => {
  it("is unit-aware: 57 ft must never collide with 57 m", () => {
    const imperial = validDraft();
    const metric = validDraft();
    metric.units = UnitSystem.Metric;
    expect(dedupKeyOfDraft(imperial)).not.toBe(dedupKeyOfDraft(metric));
  });

  it("derives the same header fields the chain will store", () => {
    const fields = dedupFieldsOfDraft(validDraft());
    expect(fields.diveDate).toBe(stringToYmd("2015-06-15"));
    expect(fields.maxDepth).toBe(depthToTenths(55));
    expect(fields.bottomTimeSeconds).toBe(60 * 60); // lb - ls
  });
});

describe("analyzeRows", () => {
  const validHeader = {
    diveDate: stringToYmd("2015-06-15"),
    units: UnitSystem.Imperial,
    bottomTimeSeconds: 3600,
    maxDepth: 550,
  };
  const chainIndex = buildChainIndex([{ id: 7n, ...validHeader }]);

  it("marks on-chain matches with the dive id", () => {
    const rows = analyzeRows([{ key: "a", sourceIndex: 1, input: validDraft(), warnings: [] }], chainIndex);
    expect(rows[0].status).toBe("on-chain");
    expect(rows[0].matchedDiveId).toBe(7n);
  });

  it("first occurrence wins within the file; later copies are duplicates", () => {
    const r = (input: DiveDraft): ParsedRow => ({ key: `k${Math.random()}`, sourceIndex: 1, input, warnings: [] });
    const rows = analyzeRows([r(validDraft()), r(validDraft())], new Map());
    expect(rows[0].status).toBe("new");
    expect(rows[1].status).toBe("duplicate");
  });

  it("invalid rows carry their issues", () => {
    const bad = validDraft();
    bad.data.maxDepth = 0;
    const rows = analyzeRows([{ key: "a", sourceIndex: 1, input: bad, warnings: [] }], new Map());
    expect(rows[0].status).toBe("invalid");
    expect(rows[0].issues.length).toBeGreaterThan(0);
  });

  it("prefers the chain answer over the in-file duplicate flag", () => {
    const r = (input: DiveDraft): ParsedRow => ({ key: `k${Math.random()}`, sourceIndex: 1, input, warnings: [] });
    const rows = analyzeRows([r(validDraft()), r(validDraft())], chainIndex);
    expect(rows.map((x) => x.status)).toEqual(["on-chain", "on-chain"]);
  });
});

// ---------------------------------------------------------------------------
// chunking (SPEC-6: chunk client-side; never approach MAX_BATCH_SIZE = 100)
// ---------------------------------------------------------------------------

describe("chunkInputs", () => {
  it("slices at the measured 8 dives per transaction", () => {
    expect(DIVES_PER_TX).toBe(8);
    const items = Array.from({ length: 179 }, (_, i) => i);
    const chunks = chunkInputs(items);
    expect(chunks).toHaveLength(23); // the measured Fuji run: 179 dives -> 23 txs
    expect(chunks[0]).toHaveLength(8);
    expect(chunks[22]).toHaveLength(3);
    expect(chunks.flat()).toEqual(items);
  });
});

// ---------------------------------------------------------------------------
// export <-> import round trip (the standard is defined by this pair)
// ---------------------------------------------------------------------------

describe("Divechain Batch JSON round trip", () => {
  const mkDive = (draft: DiveDraft): DiveHeader & { draft: DiveDraft } => ({
    ...draftToHeader(draft),
    id: 0n,
    draft,
  } as DiveHeader & { draft: DiveDraft });

  it("exported rows re-import to the same draft and re-derive the same header", () => {
    const second = validDraft();
    second.units = UnitSystem.Metric;
    second.diveDate = "2018-11-30";
    second.data = {
      leaveSurfaceTime: Date.UTC(2018, 10, 30, 8, 5) / 1000,
      leaveBottomTime: Date.UTC(2018, 10, 30, 8, 55) / 1000,
      reachSurfaceTime: Date.UTC(2018, 10, 30, 9, 20) / 1000,
      bottomTimeMinutes: 50, maxDepth: 32, averageDepth: 18,
      mode: DiveMode.OCRecreational, purpose: DivePurpose.Photographic, suit: SuitType.Wet,
    };
    second.env = {
      airTemp: 27, waterTemp: 26, currentKnots: -1, bottomType: BottomType.Wreck,
      coords: { latitude: 18.32, longitude: -87.12 },
      location: " Cayman Trench ", weatherConditions: "2 ft chop",
    };
    second.decomp = {
      decompType: DecompressionType.SurfaceDecompO2, totalDecompTimeMinutes: 12,
      maxDepthAttained: 40, tableSchedule: "USN 190/140",
      repetitiveGroup: "C",
      surfaceIntervalMinutes: 95, newRepetitiveGroup: "D",
    };
    second.gas = {
      gasType: BreathingGas.Nitrox, o2Percent: 32, hePercent: 0, n2Percent: 68,
      cylinderPressureIn: 2900, cylinderPressureOut: 950, gasConsumed: 1950, bailoutPressure: 0,
    };
    second.remarks = "Night dive, octopus at the anchor chain";

    const third = validDraft();
    third.diveDate = "2010-03-03";
    third.data.leaveSurfaceTime = 0;
    third.data.leaveBottomTime = 0;
    third.data.reachSurfaceTime = 0;
    third.data.averageDepth = 22;
    third.data.mode = DiveMode.OCRecreational;
    third.data.purpose = DivePurpose.Recreational;
    third.data.suit = SuitType.Wet;
    third.env = {
      airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: BottomType.Other,
      coords: { latitude: 0, longitude: 0 }, location: "", weatherConditions: "",
    };
    third.decomp = {
      decompType: DecompressionType.NoneDecomp, totalDecompTimeMinutes: 0, maxDepthAttained: 22,
      tableSchedule: "", repetitiveGroup: "", surfaceIntervalMinutes: 0, newRepetitiveGroup: "",
    };
    third.gas = {
      gasType: BreathingGas.Air, o2Percent: 21, hePercent: 0, n2Percent: 79,
      cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
    };
    third.remarks = "";

    const originals = [validDraft(), second, third];

    const file = divesToBatchJson(originals.map((d, i) => ({ ...mkDive(d), id: BigInt(i + 1) })));
    expect(file.format).toBe("divechain-batch-json");
    expect(file.version).toBe(2);
    expect(file.dives).toHaveLength(3);

    const back = parseDiveFile(JSON.stringify(file));
    expect(back.format).toBe("divechain-json");
    for (let i = 0; i < originals.length; i++) {
      // The draft round-trips, and the header re-derives identically (which
      // means the deterministic UDDF - and its content hash - do too).
      expect(stable(back.rows[i].input)).toBe(stable(originals[i]));
      const rederived = draftToHeader(back.rows[i].input);
      const originalHeader = draftToHeader(originals[i]);
      expect(rederived.diveDate).toBe(originalHeader.diveDate);
      expect(rederived.maxDepth).toBe(originalHeader.maxDepth);
      expect(rederived.bottomTimeSeconds).toBe(originalHeader.bottomTimeSeconds);
      expect(rederived.tableSchedule).toBe(originalHeader.tableSchedule);
      expect(rederived.o2Bps).toBe(originalHeader.o2Bps);
      expect(rederived.heBps).toBe(originalHeader.heBps);
      expect(rederived.surfaceIntervalSeconds).toBe(originalHeader.surfaceIntervalSeconds);
    }
  });

  it("omits default fields so hand-written files stay small", () => {
    const d = validDraft();
    d.data.averageDepth = d.data.maxDepth;
    d.data.leaveSurfaceTime = 0;
    d.data.leaveBottomTime = 0;
    d.data.reachSurfaceTime = 0;
    d.env = {
      airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: BottomType.Other,
      coords: { latitude: 0, longitude: 0 }, location: "", weatherConditions: "",
    };
    d.decomp = {
      decompType: DecompressionType.NoneDecomp, totalDecompTimeMinutes: 0,
      maxDepthAttained: d.data.maxDepth, tableSchedule: "",
      repetitiveGroup: "", surfaceIntervalMinutes: 0, newRepetitiveGroup: "",
    };
    d.gas = {
      gasType: BreathingGas.Air, o2Percent: 21, hePercent: 0, n2Percent: 79,
      cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0,
    };
    d.remarks = "";

    const json = diveToStandardJson({ ...draftToHeader(d), id: 1n, draft: d });
    expect(json).toEqual({
      date: "2015-06-15",
      units: "imperial",
      mode: "surface-supplied",
      purpose: "inspection",
      suit: "dry",
      maxDepth: 55,
      bottomTimeMinutes: 60,
    });
  });

  it("exports header-only dives (no local profile) with the fields the chain holds", () => {
    const h = draftToHeader(validDraft());
    const json = diveToStandardJson({ ...h, id: 1n });
    expect(json.date).toBe("2015-06-15");
    expect(json.mode).toBe("surface-supplied");
    expect(json.maxDepth).toBe(55);
    expect(json.bottomTimeMinutes).toBe(60);
    expect(json.purpose).toBeUndefined();
  });
});
