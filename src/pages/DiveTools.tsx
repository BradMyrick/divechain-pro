import { useState } from "react";

export default function DiveTools() {
  const [tool, setTool] = useState<"mod" | "ndl" | "sac">("mod");

  return (
    <div>
      <div className="mb-4 sm:mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dive Tools</h1>
        <p className="text-xs text-text-tertiary mt-1">Calculators and planners for safer diving.</p>
      </div>
      <div className="depth-ruler mb-6" />

      <div className="flex gap-1.5 mb-4 sm:mb-5 flex-wrap">
        {([
          ["mod", "Gas Mix / MOD"],
          ["ndl", "NDL Planner"],
          ["sac", "SAC Rate"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTool(key)}
            className={`text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all touch-manipulation ${
              tool === key
                ? "bg-teal/20 text-surf border border-teal/30"
                : "bg-ocean/30 text-text-secondary border border-card-border hover:text-gray-200 active:bg-navy/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tool === "mod" && <ModCalculator />}
      {tool === "ndl" && <NdlPlanner />}
      {tool === "sac" && <SacCalculator />}
    </div>
  );
}

function ModCalculator() {
  const [o2, setO2] = useState(21);
  const [he, setHe] = useState(0);
  const [ppo2, setPpo2] = useState(1.4);
  const [depthUnit, setDepthUnit] = useState<"m" | "ft">("m");

  const mod = ((ppo2 / (o2 / 100)) - 1) * (depthUnit === "m" ? 10 : 33);
  const ead = ((1 - o2 / 100 - he / 100) * (mod / (depthUnit === "m" ? 10 : 33) + 1) - 1) * (depthUnit === "m" ? 10 : 33);
  const n2 = 100 - o2 - he;
  const bestMix = Math.round((ppo2 / (mod / (depthUnit === "m" ? 10 : 33) + 1)) * 100);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Gas Mix Inputs</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">O2 %</label>
              <input type="number" value={o2} onChange={(e) => setO2(Number(e.target.value))} min={1} max={100} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">He %</label>
              <input type="number" value={he} onChange={(e) => setHe(Number(e.target.value))} min={0} max={100} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">N2 %</label>
              <input type="number" value={n2} disabled className="!py-2 !text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Max PO2</label>
              <input type="number" value={ppo2} onChange={(e) => setPpo2(Number(e.target.value))} step={0.1} min={0.1} max={2.0} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Unit</label>
              <select value={depthUnit} onChange={(e) => setDepthUnit(e.target.value as "m" | "ft")} className="!py-2 !text-sm">
                <option value="m">Metric (m)</option>
                <option value="ft">Imperial (ft)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Results</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{isFinite(mod) ? Math.round(mod) : "--"}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">{depthUnit} MOD</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{isFinite(ead) && ead > 0 ? Math.round(ead) : "--"}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">{depthUnit} EAD</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{bestMix > 0 && bestMix <= 100 ? bestMix + "%" : "--"}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">Best Mix O2</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-lg sm:text-xl font-bold text-surf leading-tight">{o2 > 21 ? "EAN" + o2 : he > 0 ? `TMX ${o2}/${he}` : "Air"}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">Gas Name</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-inner p-3 text-[11px] sm:text-xs text-text-tertiary">
        <p><strong className="text-bismuth">MOD</strong> = Maximum Operating Depth at PO2 {ppo2} &middot; <strong className="text-bismuth">EAD</strong> = Equivalent Air Depth &middot; <strong className="text-bismuth">Best Mix</strong> = Optimal O2% at MOD</p>
      </div>
    </div>
  );
}

function NdlPlanner() {
  const [depth, setDepth] = useState(18);
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const depthM = unit === "ft" ? depth / 3.28 : depth;
  const depthATM = depthM / 10 + 1;
  const rnt = Math.max(0, Math.round((depthATM - 1) * 8));
  const ndl = Math.max(0, Math.round(200 / depthATM));
  const totalTL = ndl + rnt;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Dive Parameters</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Planned Depth ({unit})</label>
              <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} min={1} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as "m" | "ft")} className="!py-2 !text-sm">
                <option value="m">Metric</option>
                <option value="ft">Imperial</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">No-Decompression Limits</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{ndl}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">NDL (min)</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{rnt}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">RNT (min)</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{totalTL}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">TTL (min)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-inner p-3 text-[11px] sm:text-xs text-text-tertiary">
        <p><strong className="text-bismuth">NDL</strong> = No-decompression limit &middot; <strong className="text-bismuth">RNT</strong> = Residual nitrogen time (estimated) &middot; <strong className="text-bismuth">TTL</strong> = Total time limit</p>
        <p className="text-warn mt-1 text-[10px]">Simplified model. Always use dive tables or a dive computer for actual dive planning.</p>
      </div>
    </div>
  );
}

function SacCalculator() {
  const [tankSize, setTankSize] = useState(12);
  const [pressureStart, setPressureStart] = useState(200);
  const [pressureEnd, setPressureEnd] = useState(80);
  const [depth, setDepth] = useState(20);
  const [time, setTime] = useState(45);
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  const usedPressure = pressureStart - pressureEnd;
  const gasUsed = unit === "metric" ? tankSize * usedPressure : tankSize * usedPressure / 14.5;
  const depthATM = unit === "metric" ? depth / 10 + 1 : depth / 33 + 1;
  const sac = time > 0 ? gasUsed / (depthATM * time) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Dive Data</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
                Tank Size ({unit === "metric" ? "L" : "cu ft"})
              </label>
              <input type="number" value={tankSize} onChange={(e) => setTankSize(Number(e.target.value))} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
                Start Press. ({unit === "metric" ? "bar" : "psi"})
              </label>
              <input type="number" value={pressureStart} onChange={(e) => setPressureStart(Number(e.target.value))} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
                End Press. ({unit === "metric" ? "bar" : "psi"})
              </label>
              <input type="number" value={pressureEnd} onChange={(e) => setPressureEnd(Number(e.target.value))} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
                Avg Depth ({unit === "metric" ? "m" : "ft"})
              </label>
              <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Bottom Time (min)</label>
              <input type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} className="!py-2 !text-sm" />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">System</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as "metric" | "imperial")} className="!py-2 !text-sm">
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Results</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{sac.toFixed(1)}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">{unit === "metric" ? "L/min" : "cu ft/min"} SAC</p>
            </div>
            <div className="stat-box !p-3">
              <p className="text-xl sm:text-2xl font-bold text-surf tabular-nums">{(sac * depthATM).toFixed(1)}</p>
              <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">{unit === "metric" ? "L/min" : "cu ft/min"} RMV</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-inner p-3 text-[11px] sm:text-xs text-text-tertiary">
        <p><strong className="text-bismuth">SAC</strong> = Surface Air Consumption rate &middot; <strong className="text-bismuth">RMV</strong> = Respiratory Minute Volume at depth</p>
        <p className="mt-1 text-[10px]">Typical SAC range: 12-20 L/min (relaxed) &middot; 20-30 L/min (working)</p>
      </div>
    </div>
  );
}
