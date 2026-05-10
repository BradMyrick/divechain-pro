import { useState } from "react";

export default function DiveTools() {
  const [tool, setTool] = useState<"mod" | "ndl" | "sac">("mod");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dive Tools</h1>
        <p className="text-xs text-gray-500 mt-1">Calculators and planners for safer diving.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          ["mod", "Gas Mix / MOD"],
          ["ndl", "NDL Planner"],
          ["sac", "SAC Rate"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTool(key)}
            className={`text-sm px-4 py-2 rounded-lg transition-all ${
              tool === key
                ? "bg-teal/20 text-surf border border-teal/30"
                : "bg-ocean/30 text-gray-400 border border-card-border hover:text-gray-200"
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass-card p-5 space-y-4">
        <div className="section-title">Gas Mix Inputs</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">O2 %</label>
            <input type="number" value={o2} onChange={(e) => setO2(Number(e.target.value))} min={1} max={100} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">He %</label>
            <input type="number" value={he} onChange={(e) => setHe(Number(e.target.value))} min={0} max={100} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">N2 %</label>
            <input type="number" value={n2} disabled />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Max PO2</label>
            <input type="number" value={ppo2} onChange={(e) => setPpo2(Number(e.target.value))} step={0.1} min={0.1} max={2.0} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Unit</label>
            <select value={depthUnit} onChange={(e) => setDepthUnit(e.target.value as "m" | "ft")}>
              <option value="m">Metric (m)</option>
              <option value="ft">Imperial (ft)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="section-title">Results</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{isFinite(mod) ? Math.round(mod) : "--"}</p>
            <p className="text-[10px] text-gray-500 uppercase">{depthUnit} MOD</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{isFinite(ead) && ead > 0 ? Math.round(ead) : "--"}</p>
            <p className="text-[10px] text-gray-500 uppercase">{depthUnit} EAD</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{bestMix > 0 && bestMix <= 100 ? bestMix : "--"}%</p>
            <p className="text-[10px] text-gray-500 uppercase">Best Mix O2</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{o2 > 21 ? "EAN" + o2 : he > 0 ? `TMX ${o2}/${he}` : "Air"}</p>
            <p className="text-[10px] text-gray-500 uppercase">Gas Name</p>
          </div>
        </div>
        <div className="glass-card-inner p-3 text-xs text-gray-500">
          <p><strong className="text-bismuth">MOD</strong> = Maximum Operating Depth at PO2 {ppo2}</p>
          <p><strong className="text-bismuth">EAD</strong> = Equivalent Air Depth for decompression</p>
          <p><strong className="text-bismuth">Best Mix</strong> = Optimal O2% for target depth</p>
        </div>
      </div>
    </div>
  );
}

function NdlPlanner() {
  const [depth, setDepth] = useState(18);
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const depthM = unit === "ft" ? depth / 3.3 : depth;
  const depthATM = depthM / 10 + 1;
  const rnt = Math.max(0, Math.round((depthATM - 1) * 8));
  const ndl = Math.max(0, Math.round(200 / depthATM));
  const totalTL = ndl + rnt;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass-card p-5 space-y-4">
        <div className="section-title">Dive Parameters</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Planned Depth ({unit})</label>
            <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as "m" | "ft")}>
              <option value="m">Metric</option>
              <option value="ft">Imperial</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="section-title">No-Decompression Limits (estimated)</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{ndl}</p>
            <p className="text-[10px] text-gray-500 uppercase">NDL (min)</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{rnt}</p>
            <p className="text-[10px] text-gray-500 uppercase">RNT (min)</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{totalTL}</p>
            <p className="text-[10px] text-gray-500 uppercase">TTL (min)</p>
          </div>
        </div>
        <div className="glass-card-inner p-3 text-xs text-gray-500">
          <p><strong className="text-bismuth">NDL</strong> = No-decompression limit (time at depth)</p>
          <p><strong className="text-bismuth">RNT</strong> = Residual nitrogen time (estimated)</p>
          <p><strong className="text-bismuth">TTL</strong> = Total time limit</p>
          <p className="text-warn mt-1">Simplified model. Always use dive tables or a dive computer.</p>
        </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass-card p-5 space-y-4">
        <div className="section-title">Dive Data</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
              Tank Size ({unit === "metric" ? "L" : "cu ft"})
            </label>
            <input type="number" value={tankSize} onChange={(e) => setTankSize(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
              Start Pressure ({unit === "metric" ? "bar" : "psi"})
            </label>
            <input type="number" value={pressureStart} onChange={(e) => setPressureStart(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
              End Pressure ({unit === "metric" ? "bar" : "psi"})
            </label>
            <input type="number" value={pressureEnd} onChange={(e) => setPressureEnd(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">
              Avg Depth ({unit === "metric" ? "m" : "ft"})
            </label>
            <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">Bottom Time (min)</label>
            <input type="number" value={time} onChange={(e) => setTime(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">System</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as "metric" | "imperial")}>
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="section-title">Results</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{sac.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500 uppercase">{unit === "metric" ? "L/min" : "cu ft/min"} SAC</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{(sac * depthATM).toFixed(1)}</p>
            <p className="text-[10px] text-gray-500 uppercase">{unit === "metric" ? "L/min" : "cu ft/min"} RMV</p>
          </div>
        </div>
        <div className="glass-card-inner p-3 text-xs text-gray-500">
          <p><strong className="text-bismuth">SAC</strong> = Surface Air Consumption rate</p>
          <p><strong className="text-bismuth">RMV</strong> = Respiratory Minute Volume at depth</p>
          <p className="mt-1">Typical SAC: 12-20 L/min (relaxed), 20-30 L/min (working)</p>
        </div>
      </div>
    </div>
  );
}
