import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import {
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BreathingGas,
  DecompressionType,
  UNIT_SYSTEM_LABELS,
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  SUIT_TYPE_LABELS,
  BREATHING_GAS_LABELS,
  DECOMP_TYPE_LABELS,
} from "../lib/contracts";
import { BookOpenIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function LogDive() {
  const navigate = useNavigate();
  const { hasContract, contractAddress } = useDiveContract();
  const { logDive, isPending, isConfirming, isSuccess, error } = useDiveLog(contractAddress);

  const [diveDate, setDiveDate] = useState("");
  const [units, setUnits] = useState<UnitSystem>(UnitSystem.Metric);
  const [maxDepth, setMaxDepth] = useState(30);
  const [averageDepth, setAverageDepth] = useState(15);
  const [bottomTimeMinutes, setBottomTimeMinutes] = useState(45);
  const [mode, setMode] = useState<DiveMode>(DiveMode.SCUBA);
  const [purpose, setPurpose] = useState<DivePurpose>(DivePurpose.Recreational);
  const [suit, setSuit] = useState<SuitType>(SuitType.Wet);
  const [location, setLocation] = useState("");
  const [waterTemp, setWaterTemp] = useState(20);
  const [airTemp, setAirTemp] = useState(25);
  const [bottomType, setBottomType] = useState("");
  const [weatherConditions, setWeatherConditions] = useState("");
  const [decompType, setDecompType] = useState<DecompressionType>(DecompressionType.NoneDecomp);
  const [totalDecompTime, setTotalDecompTime] = useState(0);
  const [gasType, setGasType] = useState<BreathingGas>(BreathingGas.Air);
  const [o2Percent, setO2Percent] = useState(21);
  const [hePercent, setHePercent] = useState(0);
  const [remarks, setRemarks] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContract || !diveDate) return;

    const dateSeconds = BigInt(Math.floor(new Date(diveDate).getTime() / 1000));

    logDive({
      diveDate: dateSeconds,
      units,
      data: {
        leaveSurfaceTime: 0,
        leaveBottomTime: 0,
        reachSurfaceTime: 0,
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
        currentKnots: 0,
        location,
        bottomType,
        weatherConditions,
      },
      decomp: {
        decompType,
        totalDecompTimeMinutes: totalDecompTime,
        maxDepthAttained: maxDepth,
        tableSchedule: "0x0000000000000000000000000000000000000000000000000000000000000000",
        repetitiveGroup: "0x00",
        surfaceIntervalMinutes: 0,
        newRepetitiveGroup: "0x00",
      },
      gas: {
        gasType,
        o2Percent,
        hePercent,
        n2Percent: 100 - o2Percent - hePercent,
        cylinderPressureIn: 0,
        cylinderPressureOut: 0,
        gasConsumed: 0,
        bailoutPressure: 0,
      },
      remarks,
    });
  };

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card p-8">
          <BookOpenIcon className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">No dive log found. Deploy one first.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">
            Create Dive Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Log a Dive</h1>
        <p className="text-xs text-gray-500 mt-1">Record your dive data on-chain, permanently.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card p-6 space-y-4">
          <div className="section-title">Basic Info</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Dive Date</label>
              <input type="date" value={diveDate} onChange={(e) => setDiveDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Unit System</label>
              <select value={units} onChange={(e) => setUnits(Number(e.target.value) as UnitSystem)}>
                {Object.entries(UNIT_SYSTEM_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Mode</label>
              <select value={mode} onChange={(e) => setMode(Number(e.target.value) as DiveMode)}>
                {Object.entries(DIVE_MODE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Purpose</label>
              <select value={purpose} onChange={(e) => setPurpose(Number(e.target.value) as DivePurpose)}>
                {Object.entries(DIVE_PURPOSE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="section-title">Dive Data</div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Max Depth ({units === UnitSystem.Metric ? "m" : "ft"})
              </label>
              <input type="number" value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} required />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Avg Depth ({units === UnitSystem.Metric ? "m" : "ft"})
              </label>
              <input type="number" value={averageDepth} onChange={(e) => setAverageDepth(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Bottom Time (min)</label>
              <input type="number" value={bottomTimeMinutes} onChange={(e) => setBottomTimeMinutes(Number(e.target.value))} required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Suit Type</label>
            <select value={suit} onChange={(e) => setSuit(Number(e.target.value) as SuitType)}>
              {Object.entries(SUIT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="section-title">Environment</div>

          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Great Barrier Reef, Australia" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Water Temp ({units === UnitSystem.Metric ? "\u00B0C" : "\u00B0F"})
              </label>
              <input type="number" value={waterTemp} onChange={(e) => setWaterTemp(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Air Temp ({units === UnitSystem.Metric ? "\u00B0C" : "\u00B0F"})
              </label>
              <input type="number" value={airTemp} onChange={(e) => setAirTemp(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Bottom Type</label>
              <input type="text" value={bottomType} onChange={(e) => setBottomType(e.target.value)} placeholder="Sand, Coral, Rock..." />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Weather</label>
              <input type="text" value={weatherConditions} onChange={(e) => setWeatherConditions(e.target.value)} placeholder="Clear, Overcast..." />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="section-title">Gas & Decompression</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Breathing Gas</label>
              <select value={gasType} onChange={(e) => setGasType(Number(e.target.value) as BreathingGas)}>
                {Object.entries(BREATHING_GAS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Decompression</label>
              <select value={decompType} onChange={(e) => setDecompType(Number(e.target.value) as DecompressionType)}>
                {Object.entries(DECOMP_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">O2 %</label>
              <input type="number" value={o2Percent} onChange={(e) => setO2Percent(Number(e.target.value))} min={0} max={100} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">He %</label>
              <input type="number" value={hePercent} onChange={(e) => setHePercent(Number(e.target.value))} min={0} max={100} />
            </div>
          </div>

          {decompType !== DecompressionType.NoneDecomp && (
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Total Deco Time (min)</label>
              <input type="number" value={totalDecompTime} onChange={(e) => setTotalDecompTime(Number(e.target.value))} />
            </div>
          )}
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="section-title">Remarks</div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any notes about the dive..."
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="btn-primary w-full text-center"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Logging Dive..." : "Log Dive"}
        </button>

        {error && <p className="text-sm text-danger text-center">{error.message}</p>}

        {isSuccess && (
          <div className="glass-card-inner p-4 text-center border-kelp/30">
            <p className="text-kelp font-medium flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-5 h-5" /> Dive logged successfully!
            </p>
            <button
              type="button"
              onClick={() => navigate("/logbook")}
              className="mt-2 text-sm text-surf underline"
            >
              View in Logbook
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
