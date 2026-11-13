import { describe, it, expect } from "vitest";
import {
  emptyDiveFormState,
  diveFormToDraft,
  draftToDiveForm,
  startDayMismatch,
  epochToLocalInput,
} from "./diveForm";
import { UnitSystem, DiveMode } from "./contracts";

describe("emptyDiveFormState defaults", () => {
  it("starts on the v2 defaults: OC recreational, metric, today", () => {
    const s = emptyDiveFormState();
    expect(s.mode).toBe(DiveMode.OCRecreational);
    expect(s.units).toBe(UnitSystem.Metric);
    expect(s.diveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.maxDepth).toBeGreaterThan(0);
    expect(s.bottomTimeMinutes).toBeGreaterThan(0);
  });
});

describe("draft round trip", () => {
  it("preserves the dive date and every set value", () => {
    const s = emptyDiveFormState();
    s.diveDate = "2016-08-14";
    s.units = UnitSystem.Imperial;
    s.maxDepth = 145;
    s.averageDepth = 90;
    s.bottomTimeMinutes = 72;
    s.mode = DiveMode.SurfaceSupplied;
    s.location = "Eugene Island 224";
    s.lat = "28.65";
    s.lon = "-92.0";
    s.waterTemp = 60;
    s.airTemp = 78;
    s.currentKnots = 2;
    s.tableSchedule = "USN 190/140";
    s.remarks = "surface decompression on O2";

    const draft = diveFormToDraft(s);
    const back = draftToDiveForm(draft);

    expect(back.diveDate).toBe("2016-08-14");
    expect(back.units).toBe(UnitSystem.Imperial);
    expect(back.maxDepth).toBe(145);
    expect(back.averageDepth).toBe(90);
    expect(back.bottomTimeMinutes).toBe(72);
    expect(back.mode).toBe(DiveMode.SurfaceSupplied);
    expect(back.location).toBe("Eugene Island 224");
    expect(back.waterTemp).toBe(60);
    expect(back.airTemp).toBe(78);
    expect(back.currentKnots).toBe(2);
    expect(back.tableSchedule).toBe("USN 190/140");
    expect(back.remarks).toBe("surface decompression on O2");
    // re-deriving the draft reproduces the identical record
    expect(diveFormToDraft(back)).toEqual(draft);
  });

  it("never emits negative derived values", () => {
    const s = emptyDiveFormState();
    s.o2Percent = 80;
    s.hePercent = 40; // sums over 100
    s.cylIn = 500;
    s.cylOut = 900; // out > in
    const draft = diveFormToDraft(s);
    expect(draft.gas.n2Percent).toBe(0);
    expect(draft.gas.gasConsumed).toBe(0);
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

describe("epochToLocalInput bridge", () => {
  it("keeps epoch instants through the datetime-local bridge", () => {
    const unix = Date.UTC(2015, 5, 1, 14, 30) / 1000;
    const localStr = epochToLocalInput(unix);
    expect(new Date(localStr).getTime() / 1000).toBe(unix);
    expect(epochToLocalInput(0)).toBe("");
  });
});
