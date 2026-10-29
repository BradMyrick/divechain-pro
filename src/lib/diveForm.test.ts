import { describe, it, expect } from "vitest";
import {
  emptyDiveFormState,
  diveFormToInput,
  diveInputToForm,
  startDayMismatch,
  epochToLocalInput,
} from "./diveForm";
import { UnitSystem, DiveMode, DivePurpose, SuitType, DecompressionType } from "./contracts";
import { strToBytes32, noonUtc } from "./batchImport";
import { ZERO_BYTES32 } from "./types";

describe("diveFormToInput", () => {
  it("encodes the dive date at noon UTC (the site-wide convention)", () => {
    const s = emptyDiveFormState();
    s.diveDate = "2014-02-21";
    const input = diveFormToInput(s);
    expect(input.diveDate).toBe(noonUtc("2014-02-21"));
    expect(new Date(input.diveDate * 1000).toISOString()).toBe("2014-02-21T12:00:00.000Z");
  });

  it("derives n2 and gas consumed like the original /log-dive page", () => {
    const s = emptyDiveFormState();
    s.o2Percent = 32;
    s.hePercent = 0;
    s.cylIn = 3000;
    s.cylOut = 1200;
    const input = diveFormToInput(s);
    expect(input.gas.n2Percent).toBe(68);
    expect(input.gas.gasConsumed).toBe(1800);
    expect(input.gas.bailoutPressure).toBe(0);
  });

  it("never emits negative derived values", () => {
    const s = emptyDiveFormState();
    s.o2Percent = 80;
    s.hePercent = 40; // sums over 100
    s.cylIn = 500;
    s.cylOut = 900; // out > in
    const input = diveFormToInput(s);
    expect(input.gas.n2Percent).toBe(0);
    expect(input.gas.gasConsumed).toBe(0);
  });

  it("encodes the table schedule to bytes32, empty stays zero", () => {
    const s = emptyDiveFormState();
    s.decompType = DecompressionType.Standard;
    s.tableSchedule = "  60/120 ";
    const withSchedule = diveFormToInput(s);
    expect(withSchedule.decomp.tableSchedule).toBe(strToBytes32("60/120"));

    s.tableSchedule = "";
    expect(diveFormToInput(s).decomp.tableSchedule).toBe(ZERO_BYTES32);
  });

  it("leaves optional times at 0 when blank", () => {
    const s = emptyDiveFormState();
    const input = diveFormToInput(s);
    expect(input.data.leaveSurfaceTime).toBe(0);
    expect(input.data.leaveBottomTime).toBe(0);
    expect(input.data.reachSurfaceTime).toBe(0);
  });
});

describe("diveInputToForm round trip", () => {
  it("preserves the dive date's UTC calendar day and every set value", () => {
    const s = emptyDiveFormState();
    s.diveDate = "2016-08-14";
    s.units = UnitSystem.Imperial;
    s.maxDepth = 145;
    s.averageDepth = 90;
    s.bottomTimeMinutes = 72;
    s.mode = DiveMode.SSA;
    s.purpose = DivePurpose.Repair;
    s.suit = SuitType.Dry;
    s.location = "Eugene Island 224";
    s.lat = "28650000";
    s.lon = "-92000000";
    s.waterTemp = 60;
    s.airTemp = 78;
    s.currentKnots = 2;
    s.decompType = DecompressionType.SurfaceDecompO2;
    s.totalDecompTime = 44;
    s.tableSchedule = "190/140";
    s.remarks = "surface decompression on O2";

    const input = diveFormToInput(s);
    const back = diveInputToForm(input);

    expect(back.diveDate).toBe("2016-08-14");
    expect(back.units).toBe(UnitSystem.Imperial);
    expect(back.maxDepth).toBe(145);
    expect(back.averageDepth).toBe(90);
    expect(back.bottomTimeMinutes).toBe(72);
    expect(back.mode).toBe(DiveMode.SSA);
    expect(back.purpose).toBe(DivePurpose.Repair);
    expect(back.suit).toBe(SuitType.Dry);
    expect(back.location).toBe("Eugene Island 224");
    expect(back.lat).toBe("28650000");
    expect(back.lon).toBe("-92000000");
    expect(back.waterTemp).toBe(60);
    expect(back.airTemp).toBe(78);
    expect(back.currentKnots).toBe(2);
    expect(back.decompType).toBe(DecompressionType.SurfaceDecompO2);
    expect(back.totalDecompTime).toBe(44);
    expect(back.tableSchedule).toBe("190/140");
    expect(back.remarks).toBe("surface decompression on O2");
    // re-encoding reproduces the identical payload
    expect(diveFormToInput(back)).toEqual(input);
  });

  it("keeps epoch instants through the datetime-local bridge", () => {
    const unix = Date.UTC(2015, 5, 1, 14, 30) / 1000;
    const localStr = epochToLocalInput(unix);
    expect(new Date(localStr).getTime() / 1000).toBe(unix);
    expect(epochToLocalInput(0)).toBe("");
  });
});

describe("startDayMismatch", () => {
  it("flags in/out times on a different calendar day than the dive date", () => {
    const s = emptyDiveFormState();
    s.diveDate = "2026-10-29";
    expect(startDayMismatch(s)).toBe(false);
    s.leaveSurface = "2026-10-29T09:15";
    expect(startDayMismatch(s)).toBe(false);
    s.leaveSurface = "2026-10-30T00:15";
    expect(startDayMismatch(s)).toBe(true);
  });
});
