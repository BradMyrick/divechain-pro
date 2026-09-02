import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
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
import type { DiveInput } from "../lib/types";
import { ZERO_BYTES32, ZERO_BYTES1 } from "../lib/types";
import { buildAttestationRequestParams } from "../lib/attestations";
import QRCode from "../components/QRCode";
import FlagChip from "../components/FlagChip";
import { useAccount } from "wagmi";
import { BookOpen, CheckCircle, Loader2, MapPin, Compass } from "lucide-react";

const toUnix = (dt: string): number => (dt ? Math.floor(new Date(dt).getTime() / 1000) : 0);
const todayDateStr = () => new Date().toISOString().slice(0, 10);

export default function LogDive() {
  const navigate = useNavigate();
  const { chain } = useAccount();
  const { hasContract, contractAddress } = useDiveContract();
  const { logDive, diveCount, isPending, isConfirming, isSuccess, error } = useDiveLog(contractAddress);

  const [diveDate, setDiveDate] = useState(todayDateStr());
  const [units, setUnits] = useState<UnitSystem>(UnitSystem.Metric);
  const [leaveSurface, setLeaveSurface] = useState("");
  const [leaveBottom, setLeaveBottom] = useState("");
  const [reachSurface, setReachSurface] = useState("");
  const [maxDepth, setMaxDepth] = useState(30);
  const [averageDepth, setAverageDepth] = useState(15);
  const [bottomTimeMinutes, setBottomTimeMinutes] = useState(45);
  const [mode, setMode] = useState<DiveMode>(DiveMode.SCUBA);
  const [purpose, setPurpose] = useState<DivePurpose>(DivePurpose.Recreational);
  const [suit, setSuit] = useState<SuitType>(SuitType.Wet);

  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [waterTemp, setWaterTemp] = useState(20);
  const [airTemp, setAirTemp] = useState(25);
  const [currentKnots, setCurrentKnots] = useState(0);
  const [bottomType, setBottomType] = useState<BottomType>(BottomType.Sand);
  const [weatherConditions, setWeatherConditions] = useState("");

  const [decompType, setDecompType] = useState<DecompressionType>(DecompressionType.NoneDecomp);
  const [totalDecompTime, setTotalDecompTime] = useState(0);
  const [gasType, setGasType] = useState<BreathingGas>(BreathingGas.Air);
  const [o2Percent, setO2Percent] = useState(21);
  const [hePercent, setHePercent] = useState(0);
  const [cylIn, setCylIn] = useState(0);
  const [cylOut, setCylOut] = useState(0);
  const [remarks, setRemarks] = useState("");

  const fillCurrentCoords = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      setLat((p.coords.latitude * 1e6).toFixed(0));
      setLon((p.coords.longitude * 1e6).toFixed(0));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContract || !diveDate) return;
    // diveDate = unix midnight of the selected day (date-only → 00:00 UTC)
    const diveDateUnix = Math.floor(Date.parse(`${diveDate}T00:00:00Z`) / 1000);
    const input: DiveInput = {
      diveDate: diveDateUnix,
      units,
      data: {
        leaveSurfaceTime: toUnix(leaveSurface),
        leaveBottomTime: toUnix(leaveBottom),
        reachSurfaceTime: toUnix(reachSurface),
        bottomTimeMinutes,
        maxDepth,
        averageDepth,
        mode,
        purpose,
        suit,
      },
      env: {
        airTemp,
        waterTemp,
        currentKnots,
        bottomType,
        coords: { latitude: Number(lat) || 0, longitude: Number(lon) || 0 },
        location,
        weatherConditions,
      },
      decomp: {
        decompType,
        totalDecompTimeMinutes: totalDecompTime,
        maxDepthAttained: maxDepth,
        tableSchedule: ZERO_BYTES32,
        repetitiveGroup: ZERO_BYTES1,
        surfaceIntervalMinutes: 0,
        newRepetitiveGroup: ZERO_BYTES1,
      },
      gas: {
        gasType,
        o2Percent,
        hePercent,
        n2Percent: Math.max(0, 100 - o2Percent - hePercent),
        cylinderPressureIn: cylIn,
        cylinderPressureOut: cylOut,
        gasConsumed: Math.max(0, cylIn - cylOut),
        bailoutPressure: 0,
      },
      remarks,
    };
    logDive(input);
  };

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <p className="text-text-secondary mb-6">No dive log bound to this wallet yet.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Deploy Your Logbook</button>
        </div>
      </div>
    );
  }

  const dUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "m" : "ft";
  const pUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "bar" : "psi";
  const tUnit = UNIT_SYSTEM_LABELS[units] === "Metric" ? "\u00B0C" : "\u00B0F";

  return (
    <div className="max-w-3xl mx-auto animate-rise">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Log a dive</h1>
        <p className="text-sm text-text-tertiary mt-1">Recorded permanently on-chain. Append-only.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic */}
        <div className="glass-card hairline p-6 space-y-4">
          <div className="section-title">Dive overview</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dive date">
              <input type="date" value={diveDate} onChange={(e) => setDiveDate(e.target.value)} required />
            </Field>
            <Field label="Unit system">
              <Select value={units} onChange={(n) => setUnits(n as UnitSystem)} options={UNIT_SYSTEM_LABELS} />
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={setMode as (n: number) => void} options={DIVE_MODE_LABELS} />
            </Field>
            <Field label="Purpose">
              <Select value={purpose} onChange={setPurpose as (n: number) => void} options={DIVE_PURPOSE_LABELS} />
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
              <input type="number" value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} required min={1} />
            </Field>
            <Field label={`Avg depth (${dUnit})`}>
              <input type="number" value={averageDepth} onChange={(e) => setAverageDepth(Number(e.target.value))} min={0} />
            </Field>
            <Field label="Bottom time (min)">
              <input type="number" value={bottomTimeMinutes} onChange={(e) => setBottomTimeMinutes(Number(e.target.value))} required min={1} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Suit">
              <Select value={suit} onChange={setSuit as (n: number) => void} options={SUIT_TYPE_LABELS} />
            </Field>
            <Field label="Bottom composition">
              <Select value={bottomType} onChange={setBottomType as (n: number) => void} options={BOTTOM_TYPE_LABELS} />
            </Field>
          </div>
          <details className="glass-card-inner p-3">
            <summary className="text-xs text-text-secondary cursor-pointer select-none flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> In/out times (optional, UTC)
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Field label="Left surface">
                <input type="datetime-local" value={leaveSurface} onChange={(e) => setLeaveSurface(e.target.value)} />
              </Field>
              <Field label="Left bottom">
                <input type="datetime-local" value={leaveBottom} onChange={(e) => setLeaveBottom(e.target.value)} />
              </Field>
              <Field label="Reached surface">
                <input type="datetime-local" value={reachSurface} onChange={(e) => setReachSurface(e.target.value)} />
              </Field>
            </div>
          </details>
        </div>

        {/* Environment */}
        <div className="glass-card hairline p-6 space-y-4">
          <div className="section-title">Environment</div>
          <Field label="Location">
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Great Barrier Reef, Australia" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude (µ°)">
              <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="18320000" />
            </Field>
            <Field label="Longitude (µ°)">
              <input type="number" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-149940000" />
            </Field>
          </div>
          <button type="button" onClick={fillCurrentCoords} className="btn-ghost text-xs">
            <MapPin className="w-3.5 h-3.5" /> Use my current position
          </button>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Water temp (${tUnit})`}>
              <input type="number" value={waterTemp} onChange={(e) => setWaterTemp(Number(e.target.value))} />
            </Field>
            <Field label={`Air temp (${tUnit})`}>
              <input type="number" value={airTemp} onChange={(e) => setAirTemp(Number(e.target.value))} />
            </Field>
            <Field label="Current (knots)">
              <input type="number" value={currentKnots} onChange={(e) => setCurrentKnots(Number(e.target.value))} />
            </Field>
            <Field label="Weather">
              <input type="text" value={weatherConditions} onChange={(e) => setWeatherConditions(e.target.value)} placeholder="Clear, Overcast…" />
            </Field>
          </div>
        </div>

        {/* Gas & deco */}
        <div className="glass-card hairline p-6 space-y-4">
          <div className="section-title">Gas &amp; decompression</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Breathing gas">
              <Select value={gasType} onChange={setGasType as (n: number) => void} options={BREATHING_GAS_LABELS} />
            </Field>
            <Field label="Decompression">
              <Select value={decompType} onChange={setDecompType as (n: number) => void} options={DECOMP_TYPE_LABELS} />
            </Field>
            <Field label="O₂ %">
              <input type="number" value={o2Percent} onChange={(e) => setO2Percent(Number(e.target.value))} min={0} max={100} />
            </Field>
            <Field label="He %">
              <input type="number" value={hePercent} onChange={(e) => setHePercent(Number(e.target.value))} min={0} max={100} />
            </Field>
            <Field label={`Cylinder pressure in (${pUnit})`}>
              <input type="number" value={cylIn} onChange={(e) => setCylIn(Number(e.target.value))} min={0} />
            </Field>
            <Field label={`Cylinder pressure out (${pUnit})`}>
              <input type="number" value={cylOut} onChange={(e) => setCylOut(Number(e.target.value))} min={0} />
            </Field>
          </div>
          {decompType !== DecompressionType.NoneDecomp && (
            <Field label="Total deco time (min)">
              <input type="number" value={totalDecompTime} onChange={(e) => setTotalDecompTime(Number(e.target.value))} />
            </Field>
          )}
        </div>

        {/* Remarks */}
        <div className="glass-card hairline p-6 space-y-3">
          <div className="section-title">Remarks</div>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes about the dive…" rows={3} />
        </div>

        <button type="submit" disabled={isPending || isConfirming} className="btn-primary w-full text-base">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
            : isConfirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging on-chain…</>
            : "Log dive permanently"}
        </button>

        {error && <p className="text-sm text-danger text-center">{error.message}</p>}
        {isSuccess && (
          <div className="glass-card hairline p-6 mt-5 text-center animate-slide-up">
            <CheckCircle className="w-9 h-9 text-kelp mx-auto mb-2" />
            <p className="text-kelp font-semibold">Dive logged permanently.</p>
            {diveCount !== undefined && (
              <p className="text-xs text-text-tertiary mt-1">Entry #{diveCount.toString()} in your sovereign logbook.</p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-4">
              {contractAddress && diveCount !== undefined && (
                <div>
                  <QRCode
                    value={`${window.location.origin}/attest?${buildAttestationRequestParams({
                      chainId: chain?.id ?? 43114,
                      contractAddress,
                      diveId: diveCount,
                    }).toString()}`}
                    size={120}
                  />
                  <p className="text-[10px] text-text-tertiary mt-1.5 max-w-[130px]">
                    Buddy scans to sign — free for them
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => navigate("/logbook")} className="btn-primary text-sm">
                  View in logbook
                </button>
                <button type="button" onClick={() => window.location.reload()} className="btn-ghost text-sm">
                  Log another
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
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
