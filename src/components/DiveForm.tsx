import {
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  BreathingGas,
  DecompressionType,
  UNIT_SYSTEM_LABELS,
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  SUIT_TYPE_LABELS,
  BOTTOM_TYPE_LABELS,
  BREATHING_GAS_LABELS,
  DECOMP_TYPE_LABELS,
} from "../lib/contracts";
import { startDayMismatch, type DiveFormState } from "../lib/diveForm";
import FlagChip from "./FlagChip";
import { MapPin, Compass } from "lucide-react";

/**
 * Controlled dive-entry form shared by /log-dive and the batch import editor.
 * The parent owns the state (DiveFormState) and derives the on-chain DiveInput
 * with diveFormToInput() from src/lib/diveForm.ts, so both surfaces encode
 * identically (noon-UTC dive dates, computed n2 % and gas consumed).
 */
export default function DiveForm({
  value,
  onChange,
}: {
  value: DiveFormState;
  onChange: (next: DiveFormState) => void;
}) {
  const set = <K extends keyof DiveFormState>(key: K, v: DiveFormState[K]): void => {
    onChange({ ...value, [key]: v });
  };

  const fillCurrentCoords = (): void => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      onChange({
        ...value,
        lat: (p.coords.latitude * 1e6).toFixed(0),
        lon: (p.coords.longitude * 1e6).toFixed(0),
      });
    });
  };

  const {
    diveDate, units, leaveSurface, leaveBottom, reachSurface, maxDepth, averageDepth,
    bottomTimeMinutes, mode, purpose, suit, location, lat, lon, waterTemp, airTemp,
    currentKnots, bottomType, weatherConditions, decompType, totalDecompTime,
    tableSchedule, gasType, o2Percent, hePercent, cylIn, cylOut, remarks,
  } = value;

  const dUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "m" : "ft";
  const pUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "bar" : "psi";
  const tUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "\u00B0C" : "\u00B0F";

  return (
    <div className="space-y-5">
      {/* Basic */}
      <div className="glass-card hairline p-6 space-y-4">
        <div className="section-title">Dive overview</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dive date">
            <input type="date" value={diveDate} onChange={(e) => set("diveDate", e.target.value)} required />
          </Field>
          <Field label="Unit system">
            <Select value={units} onChange={(n) => set("units", n as UnitSystem)} options={UNIT_SYSTEM_LABELS} />
          </Field>
          <Field label="Mode">
            <Select value={mode} onChange={(n) => set("mode", n as DiveMode)} options={DIVE_MODE_LABELS} />
          </Field>
          <Field label="Purpose">
            <Select value={purpose} onChange={(n) => set("purpose", n as DivePurpose)} options={DIVE_PURPOSE_LABELS} />
          </Field>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-text-tertiary">This entry flies:</span>
          <FlagChip mode={mode} purpose={purpose} className="!text-[11px]" />
        </div>
      </div>

      {/* Profile / depth */}
      <div className="glass-card hairline p-6 space-y-4">
        <div className="section-title">Profile</div>
        <div className="grid grid-cols-3 gap-4">
          <Field label={`Max depth (${dUnit})`}>
            <input type="number" value={maxDepth} onChange={(e) => set("maxDepth", Number(e.target.value))} required min={1} />
          </Field>
          <Field label={`Avg depth (${dUnit})`}>
            <input type="number" value={averageDepth} onChange={(e) => set("averageDepth", Number(e.target.value))} min={0} />
          </Field>
          <Field label="Bottom time (min)">
            <input type="number" value={bottomTimeMinutes} onChange={(e) => set("bottomTimeMinutes", Number(e.target.value))} required min={1} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Suit">
            <Select value={suit} onChange={(n) => set("suit", n as SuitType)} options={SUIT_TYPE_LABELS} />
          </Field>
          <Field label="Bottom composition">
            <Select value={bottomType} onChange={(n) => set("bottomType", n as BottomType)} options={BOTTOM_TYPE_LABELS} />
          </Field>
        </div>
        <details className="glass-card-inner p-3">
          <summary className="text-xs text-text-secondary cursor-pointer select-none flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> In/out times (optional, local clock)
          </summary>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Field label="Left surface">
              <input type="datetime-local" value={leaveSurface} onChange={(e) => set("leaveSurface", e.target.value)} />
            </Field>
            <Field label="Left bottom">
              <input type="datetime-local" value={leaveBottom} onChange={(e) => set("leaveBottom", e.target.value)} />
            </Field>
            <Field label="Reached surface">
              <input type="datetime-local" value={reachSurface} onChange={(e) => set("reachSurface", e.target.value)} />
            </Field>
          </div>
          <p className="text-[11px] text-text-tertiary mt-2">Times are optional; the dive date is the day the dive started.</p>
        </details>
        {startDayMismatch(value) && (
          <p className="text-xs text-warn">
            The leave-surface time is on a different day than the dive date. Fix one of them before logging.
          </p>
        )}
      </div>

      {/* Environment */}
      <div className="glass-card hairline p-6 space-y-4">
        <div className="section-title">Environment</div>
        <Field label="Location">
          <input type="text" value={location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Great Barrier Reef, Australia" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude (µ°)">
            <input type="number" value={lat} onChange={(e) => set("lat", e.target.value)} placeholder="18320000" />
          </Field>
          <Field label="Longitude (µ°)">
            <input type="number" value={lon} onChange={(e) => set("lon", e.target.value)} placeholder="-149940000" />
          </Field>
        </div>
        <button type="button" onClick={fillCurrentCoords} className="btn-ghost text-xs">
          <MapPin className="w-3.5 h-3.5" /> Use my current position
        </button>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Water temp (${tUnit})`}>
            <input type="number" value={waterTemp} onChange={(e) => set("waterTemp", Number(e.target.value))} />
          </Field>
          <Field label={`Air temp (${tUnit})`}>
            <input type="number" value={airTemp} onChange={(e) => set("airTemp", Number(e.target.value))} />
          </Field>
          <Field label="Current (knots)">
            <input type="number" value={currentKnots} onChange={(e) => set("currentKnots", Number(e.target.value))} />
          </Field>
          <Field label="Weather">
            <input type="text" value={weatherConditions} onChange={(e) => set("weatherConditions", e.target.value)} placeholder="Clear, Overcast…" />
          </Field>
        </div>
      </div>

      {/* Gas & deco */}
      <div className="glass-card hairline p-6 space-y-4">
        <div className="section-title">Gas &amp; decompression</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Breathing gas">
            <Select value={gasType} onChange={(n) => set("gasType", n as BreathingGas)} options={BREATHING_GAS_LABELS} />
          </Field>
          <Field label="Decompression">
            <Select value={decompType} onChange={(n) => set("decompType", n as DecompressionType)} options={DECOMP_TYPE_LABELS} />
          </Field>
          <Field label="O₂ %">
            <input type="number" value={o2Percent} onChange={(e) => set("o2Percent", Number(e.target.value))} min={0} max={100} />
          </Field>
          <Field label="He %">
            <input type="number" value={hePercent} onChange={(e) => set("hePercent", Number(e.target.value))} min={0} max={100} />
          </Field>
          <Field label={`Cylinder pressure in (${pUnit})`}>
            <input type="number" value={cylIn} onChange={(e) => set("cylIn", Number(e.target.value))} min={0} />
          </Field>
          <Field label={`Cylinder pressure out (${pUnit})`}>
            <input type="number" value={cylOut} onChange={(e) => set("cylOut", Number(e.target.value))} min={0} />
          </Field>
        </div>
        {decompType !== DecompressionType.NoneDecomp && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total deco time (min)">
              <input type="number" value={totalDecompTime} onChange={(e) => set("totalDecompTime", Number(e.target.value))} />
            </Field>
            <Field label="Table schedule">
              <input type="text" value={tableSchedule} onChange={(e) => set("tableSchedule", e.target.value)} placeholder="e.g. 60/120" />
            </Field>
          </div>
        )}
      </div>

      {/* Remarks */}
      <div className="glass-card hairline p-6 space-y-3">
        <div className="section-title">Remarks</div>
        <textarea value={remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Notes about the dive…" rows={3} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-text-secondary mb-1.5 font-semibold uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (n: number) => void;
  options: Record<number, string>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Object.entries(options).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}
