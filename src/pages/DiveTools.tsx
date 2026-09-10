import { useState } from "react";
import {
  airNdl, nitroxNdl,
} from "../lib/planning/tables";
import { ppO2, modMeters, eadMeters, bestMix, gasName } from "../lib/planning/gas";
import { rockBottom, minGasBar, minGasPsi } from "../lib/planning/rockBottom";
import { sacRate } from "../lib/planning/sac";
import {
  cnsPercent, cnsPercentDaily, otu, OTU_DAILY_LIMIT, CNS_SINGLE_LIMITS,
} from "../lib/planning/cns";
import {
  estimateWeight, SUIT_LABELS, TANK_LABELS,
  type SuitKey, type TankKey, type WaterKey,
} from "../lib/planning/weight";
import { NO_FLY_GUIDANCE } from "../lib/planning/nofly";
import { metersToFeet, feetToMeters, ata } from "../lib/planning/units";
import { AlertTriangle } from "lucide-react";

type ToolKey = "ndl" | "mingas" | "sac" | "o2" | "weight" | "nofly";

const TOOLS: [ToolKey, string][] = [
  ["ndl", "NDL Planner"],
  ["mingas", "Min Gas"],
  ["sac", "SAC Rate"],
  ["o2", "O\u2082 Clock"],
  ["weight", "Weight"],
  ["nofly", "No-Fly"],
];

export default function DiveTools() {
  const [tool, setTool] = useState<ToolKey>("ndl");

  return (
    <div>
      <div className="mb-4 sm:mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dive Tools</h1>
        <p className="text-xs text-text-tertiary mt-1">
          Plan the dive. Public-domain NOAA / U.S. Navy data, not guesswork.
        </p>
      </div>
      <div className="depth-ruler mb-6" />

      <div className="flex gap-1.5 mb-4 sm:mb-5 flex-wrap">
        {TOOLS.map(([key, label]) => (
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

      {tool === "ndl" && <NdlPlanner />}
      {tool === "mingas" && <MinGasPanel />}
      {tool === "sac" && <SacPanel />}
      {tool === "o2" && <O2Panel />}
      {tool === "weight" && <WeightPanel />}
      {tool === "nofly" && <NoFlyPanel />}

      <div className="glass-card-inner p-3 mt-4 sm:mt-5 text-[11px] sm:text-xs text-text-tertiary">
        <p>
          Planning aids built on public-domain sources: U.S. Navy / NOAA no-decompression tables
          (46 CFR 197 App. A), NOAA oxygen exposure limits, DAN Flying After Diving (2002) consensus.
          Not a dive computer, not a substitute for training. If you rely on a tool here, verify it
          against your tables before you dive it.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] sm:text-xs text-bismuth mb-1 font-medium uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Num(props: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number;
}) {
  const { label, value, onChange, ...rest } = props;
  return (
    <Field label={label}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="!py-2 !text-sm w-full"
        {...rest}
      />
    </Field>
  );
}

function Pick<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: Record<T, string> }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="!py-2 !text-sm w-full">
        {(Object.entries(options) as [T, string][]).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

function Stat({ value, label, tone = "surf" }: { value: string; label: string; tone?: "surf" | "warn" | "danger" | "kelp" }) {
  const toneCls = tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : tone === "kelp" ? "text-kelp" : "text-surf";
  return (
    <div className="stat-box !p-3">
      <p className={`text-xl sm:text-2xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      <p className="text-[9px] sm:text-[10px] text-text-tertiary uppercase">{label}</p>
    </div>
  );
}

function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "warn" | "danger" }) {
  const toneCls = tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-text-tertiary";
  return <p className={`text-[11px] sm:text-xs ${toneCls}`}>{children}</p>;
}

/* ============================== NDL PLANNER ============================== */

function NdlPlanner() {
  const [depth, setDepth] = useState(24);
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const [o2, setO2] = useState(32);

  const depthM = unit === "ft" ? feetToMeters(depth) : depth;
  const nitrox = o2 > 21 && o2 < 100;
  const res = nitrox ? nitroxNdl(depthM, o2) : airNdl(depthM);
  const p = ppO2(o2, depthM);
  const d = (m: number) => (unit === "m" ? m : metersToFeet(m));
  const dUnit = unit === "m" ? "m" : "ft";

  const beyondTable = !res;
  const overWorking = p > 1.4;
  const overContingency = p > 1.6;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Dive Parameters</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Num label={`Depth (${dUnit})`} value={depth} onChange={setDepth} min={1} />
            <Pick
              label="Unit" value={unit} onChange={setUnit}
              options={{ m: "Metric (m)", ft: "Imperial (ft)" }}
            />
            <Num label="O\u2082 %" value={o2} onChange={setO2} min={1} max={100} />
          </div>
          <Note>
            {o2 <= 21
              ? `Air. ${gasName(o2)} has no equivalent-air-depth conversion.`
              : nitrox
              ? `${gasName(o2)} planned by NOAA equivalent air depth.`
              : "Pure O\u2082 is a deco gas — plan it in the O\u2082 Clock, not here."}
          </Note>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">No-Stop Plan</p>
          {beyondTable ? (
            <div className="stat-box !p-4 flex items-center gap-3 border-danger/30">
              <AlertTriangle className="w-6 h-6 text-danger shrink-0" />
              <div>
                <p className="text-base font-bold text-danger">Past the no-deco tables</p>
                <p className="text-[11px] text-text-tertiary">
                  Beyond 40 m / 130 ft this is a decompression dive.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Stat value={`${Math.round(res!.ndlMin)}\u2009min`} label="No-deco limit" />
                <Stat
                  value={`${Math.round(d(res!.tableDepthM))} ${dUnit}`}
                  label="Table depth used"
                />
                {nitrox && <Stat value={`${d(eadMeters(o2, depthM)).toFixed(0)} ${dUnit}`} label="EAD" />}
                <Stat
                  value={p.toFixed(2)}
                  label={`ppO\u2082 at ${Math.round(depth)} ${dUnit}`}
                  tone={overContingency ? "danger" : overWorking ? "warn" : "surf"}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat value={`${d(modMeters(o2, 1.4)).toFixed(0)} ${dUnit}`} label="MOD @ 1.4" />
                <Stat value={`${d(modMeters(o2, 1.6)).toFixed(0)} ${dUnit}`} label="MOD @ 1.6" />
                <Stat value={bestMix(1.4, depthM) > 0 ? `${bestMix(1.4, depthM)}%` : "--"} label="Best mix @ 1.4" />
              </div>
            </>
          )}
          {overContingency && <Note tone="danger">ppO₂ above 1.6 — this plan exceeds the contingency limit. Back off the depth or the mix.</Note>}
          {!overContingency && overWorking && <Note tone="warn">ppO₂ above 1.4 working limit (fine for short deco exposures, not bottom time).</Note>}
        </div>
      </div>

      <div className="glass-card-inner p-3 space-y-1">
        <Note>
          Single-dive limits from the U.S. Navy / NOAA air table, rounded conservatively to the
          next table row. In-between depths use the deeper row. No-deco only: beyond 130 ft / 40 m
          you are planning deco, not a no-stop dive.
        </Note>
        <Note>
          Repetitive dives are not credited here — tissue washout needs a real model. The Bühlmann
          planner (gradient factors, repetitive diving, deco gases) is on the roadmap.
        </Note>
      </div>
    </div>
  );
}

/* =============================== MIN GAS =============================== */

function MinGasPanel() {
  const [system, setSystem] = useState<"metric" | "imperial">("metric");
  const [depth, setDepth] = useState(25);
  const [divers, setDivers] = useState(2);
  const [stressedSac, setStressedSac] = useState(20);
  const [tank, setTank] = useState(12);
  const [servicePsi, setServicePsi] = useState(3000);
  const [tankCuFt, setTankCuFt] = useState(77.4);
  const [startP, setStartP] = useState(210);
  const [sac1, setSac1] = useState(15);
  const [sac2, setSac2] = useState(20);

  const metric = system === "metric";
  const depthM = metric ? depth : feetToMeters(depth);
  const sacL = metric ? stressedSac : stressedSac / 0.0353146667;

  const rb = rockBottom({ depthM, divers, stressedSacLMin: sacL });
  const minGasP = metric
    ? minGasBar(rb.gasLiters, tank)
    : minGasPsi(rb.gasLiters * 0.0353146667, tankCuFt, servicePsi);
  const pUnit = metric ? "bar" : "psi";
  const turnP = Math.max(0, startP - minGasP);

  const ratePerMin = (sac: number) =>
    metric
      ? (sac / tank) * ata(depthM)
      : (sac * (servicePsi / tankCuFt)) * ata(depthM);
  const usableP = Math.max(0, startP - minGasP);
  const time1 = ratePerMin(sac1) > 0 ? usableP / ratePerMin(sac1) : 0;
  const time2 = ratePerMin(sac2) > 0 ? usableP / ratePerMin(sac2) : 0;
  const teamTime = Math.min(time1, time2);
  const thirdUsed = minGasP > startP / 2;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Team &amp; Gear</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Num label={metric ? "Depth (m)" : "Depth (ft)"} value={depth} onChange={setDepth} min={1} />
            <Pick
              label="System" value={system} onChange={setSystem}
              options={{ metric: "Metric", imperial: "Imperial" }}
            />
            <Num label="Divers on the plan" value={divers} onChange={setDivers} min={2} max={4} step={1} />
            <Num
              label={`Stressed SAC (${metric ? "L/min" : "cu ft/min"})`}
              value={stressedSac} onChange={setStressedSac} min={1} step={0.05}
            />
            {metric ? (
              <Num label="Tank water capacity (L)" value={tank} onChange={setTank} min={1} step={0.5} />
            ) : (
              <>
                <Num label="Tank capacity (cu ft)" value={tankCuFt} onChange={setTankCuFt} min={1} step={0.1} />
                <Num label="Service pressure (psi)" value={servicePsi} onChange={setServicePsi} min={1} step={100} />
              </>
            )}
            <Num label={`Start pressure (${pUnit})`} value={startP} onChange={setStartP} min={0} />
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Rock Bottom</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat value={`${Math.ceil(minGasP)} ${pUnit}`} label="Min gas" tone={thirdUsed ? "warn" : "surf"} />
            <Stat value={`${Math.ceil(turnP)} ${pUnit}`} label="Turn pressure" />
            <Stat value={`${rb.runTimeMin.toFixed(1)}\u2009min`} label="Ascent runtime" />
          </div>
          {thirdUsed && (
            <Note tone="warn">
              Min gas eats more than half the fill — carry more tank or plan shallower.
            </Note>
          )}
          <div className="glass-card-inner !p-0 overflow-hidden">
            <table className="w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="text-text-tertiary uppercase text-[9px] sm:text-[10px] tracking-wider">
                  <th className="text-left px-3 py-2 font-medium">Emergency ascent leg</th>
                  <th className="text-right px-3 py-2 font-medium">Min</th>
                  <th className="text-right px-3 py-2 font-medium">ATA</th>
                </tr>
              </thead>
              <tbody>
                {rb.segments.map((s) => (
                  <tr key={s.label} className="border-t border-card-border">
                    <td className="px-3 py-1.5 text-text-secondary">{s.label}</td>
                    <td className="px-3 py-1.5 text-right text-white tabular-nums">{s.minutes.toFixed(1)}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary tabular-nums">{s.ata.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
        <p className="section-title !mb-1">Buddy Gas Match</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-md">
          <Num label={`Your SAC (${metric ? "L/min" : "cu ft/min"})`} value={sac1} onChange={setSac1} min={1} step={0.5} />
          <Num label={`Buddy's SAC (${metric ? "L/min" : "cu ft/min"})`} value={sac2} onChange={setSac2} min={1} step={0.5} />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-lg">
          <Stat value={`${time1.toFixed(0)}\u2009min`} label="Your time to turn" />
          <Stat value={`${time2.toFixed(0)}\u2009min`} label="Buddy's time to turn" />
          <Stat value={`${teamTime.toFixed(0)}\u2009min`} label="Team bottom time" tone="kelp" />
        </div>
        <Note>The team turns when the gas-hungrier diver hits turn pressure — dive the smaller number.</Note>
      </div>

      <div className="glass-card-inner p-3 space-y-1">
        <Note>
          Rock bottom = what the whole team needs to reach the surface sharing one cylinder,
          breathing stressed: 1 min at bottom, ascend to half depth at 9 m/min, regroup,
          rise to 5 m, safety stop, surface.
        </Note>
        <Note>Turn pressure assumes an identical fill in every tank on the team. Match dissimilar cylinders with your training, not this table.</Note>
      </div>
    </div>
  );
}

/* ================================ SAC =================================== */

function SacPanel() {
  const [system, setSystem] = useState<"metric" | "imperial">("metric");
  const [tankLiters, setTankLiters] = useState(12);
  const [tankCuFt, setTankCuFt] = useState(77.4);
  const [servicePsi, setServicePsi] = useState(3000);
  const [pStart, setPStart] = useState(200);
  const [pEnd, setPEnd] = useState(80);
  const [avgDepth, setAvgDepth] = useState(15);
  const [minutes, setMinutes] = useState(45);

  const metric = system === "metric";
  const depthM = metric ? avgDepth : feetToMeters(avgDepth);
  const r = sacRate({
    system,
    tankLiters: metric ? tankLiters : undefined,
    tankCuFt: metric ? undefined : tankCuFt,
    tankServicePsi: metric ? undefined : servicePsi,
    startPressure: pStart,
    endPressure: pEnd,
    avgDepthM: depthM,
    minutes,
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Dive Data</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Pick label="System" value={system} onChange={setSystem} options={{ metric: "Metric", imperial: "Imperial" }} />
            {metric ? (
              <Num label="Tank (L, water capacity)" value={tankLiters} onChange={setTankLiters} min={1} step={0.5} />
            ) : (
              <Num label="Tank (cu ft)" value={tankCuFt} onChange={setTankCuFt} min={1} step={0.1} />
            )}
            <Num label={`Start pressure (${metric ? "bar" : "psi"})`} value={pStart} onChange={setPStart} min={0} />
            <Num label={`End pressure (${metric ? "bar" : "psi"})`} value={pEnd} onChange={setPEnd} min={0} />
            {!metric && <Num label="Service pressure (psi)" value={servicePsi} onChange={setServicePsi} min={1} step={100} />}
            <Num label={`Avg depth (${metric ? "m" : "ft"})`} value={avgDepth} onChange={setAvgDepth} min={0} />
            <Num label="Bottom time (min)" value={minutes} onChange={setMinutes} min={1} />
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Results</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat value={r.sac ? r.sac.toFixed(1) : "--"} label={`${r.units} SAC`} />
            <Stat value={r.rmv ? r.rmv.toFixed(1) : "--"} label={`${r.units} at depth (RMV)`} />
          </div>
          <Note>
            Typical relaxed SAC: 12&ndash;20 L/min (0.42&ndash;0.7 cu ft/min) &middot; working: 20&ndash;30 L/min.
            Plan min gas on your stressed rate, not your best one.
          </Note>
        </div>
      </div>
    </div>
  );
}

/* =============================== O2 CLOCK =============================== */

function O2Panel() {
  const [depth, setDepth] = useState(30);
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const [o2, setO2] = useState(32);
  const [bottomMin, setBottomMin] = useState(45);
  const [decoOn, setDecoOn] = useState(false);
  const [decoO2, setDecoO2] = useState(50);
  const [decoMin, setDecoMin] = useState(20);

  const depthM = unit === "ft" ? feetToMeters(depth) : depth;
  const pBottom = ppO2(o2, depthM);
  const pDeco = ppO2(decoO2, 5);
  const segments = [
    { ppo2: pBottom, minutes: bottomMin },
    ...(decoOn ? [{ ppo2: pDeco, minutes: decoMin }] : []),
  ];
  const single = cnsPercent(segments);
  const daily = cnsPercentDaily(segments);
  const otus = otu(segments);

  const cnsTone = single > 100 ? "danger" : single >= 80 ? "warn" : "surf";
  const overLimit = pBottom > 1.6 || (decoOn && pDeco > 1.6);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Exposure</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <Num label={`Depth (${unit})`} value={depth} onChange={setDepth} min={1} />
            <Pick label="Unit" value={unit} onChange={setUnit} options={{ m: "Metric (m)", ft: "Imperial (ft)" }} />
            <Num label="Bottom O\u2082 %" value={o2} onChange={setO2} min={21} max={100} />
            <Num label="Bottom time (min)" value={bottomMin} onChange={setBottomMin} min={1} />
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={decoOn}
              onChange={(e) => setDecoOn(e.target.checked)}
              className="accent-teal"
            />
            Add a deco / rich-mix segment at 5 m
          </label>
          {decoOn && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <Pick label="Deco gas" value={String(decoO2)} onChange={(v) => setDecoO2(Number(v))} options={{ "50": "EAN50", "80": "O\u2082 80%", "100": "O\u2082 100%" }} />
              <Num label="Deco time (min)" value={decoMin} onChange={setDecoMin} min={1} />
            </div>
          )}
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Oxygen Clock</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat value={pBottom.toFixed(2)} label="ppO\u2082 on bottom" tone={pBottom > 1.6 ? "danger" : pBottom > 1.4 ? "warn" : "surf"} />
            <Stat value={`${single.toFixed(0)}%`} label="CNS single-dive" tone={cnsTone} />
            <Stat value={`${daily.toFixed(0)}%`} label="CNS 24-hour" tone={daily > 100 ? "warn" : "surf"} />
            <Stat value={`${otus.toFixed(0)}`} label={`OTU (day cap ${OTU_DAILY_LIMIT})`} tone={otus > OTU_DAILY_LIMIT ? "warn" : "surf"} />
          </div>
          {overLimit && <Note tone="danger">A segment exceeds ppO₂ 1.6 — over-limit time burns the whole clock per minute in this estimate.</Note>}
          {decoOn && <Note>Deco ppO₂ at 5 m: {pDeco.toFixed(2)} (EAN50 &rarr; 1.25, O₂ &rarr; 1.5)</Note>}
        </div>
      </div>

      <div className="glass-card-inner !p-0 overflow-hidden">
        <table className="w-full text-[11px] sm:text-xs">
          <thead>
            <tr className="text-text-tertiary uppercase text-[9px] sm:text-[10px] tracking-wider">
              <th className="text-left px-3 py-2 font-medium">ppO₂ (ATA)</th>
              {CNS_SINGLE_LIMITS.slice(0, 7).map((r) => (
                <th key={r.ppo2} className="text-right px-2 py-2 font-medium">{r.ppo2.toFixed(1)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-card-border">
              <td className="px-3 py-1.5 text-text-secondary">Single-dive limit (min)</td>
              {CNS_SINGLE_LIMITS.slice(0, 7).map((r) => (
                <td key={r.ppo2} className="px-2 py-1.5 text-right text-white tabular-nums">{r.min}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Note>
        NOAA single-dive and 24-hour exposure limits; OTU per Hamilton REPEX (day-1 cap 850,
        decaying on consecutive diving days). CNS % accumulates each segment against the
        interpolated limit. Symptoms do not care about the clock — dive conservative.
      </Note>
    </div>
  );
}

/* ================================ WEIGHT ================================ */

function WeightPanel() {
  const [suit, setSuit] = useState<SuitKey>("w3");
  const [tank, setTank] = useState<TankKey>("al80");
  const [water, setWater] = useState<WaterKey>("salt");

  const est = estimateWeight({ suit, tank, water });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Setup</p>
          <Pick label="Exposure suit" value={suit} onChange={setSuit} options={SUIT_LABELS as Record<SuitKey, string>} />
          <Pick label="Cylinder" value={tank} onChange={setTank} options={TANK_LABELS as Record<TankKey, string>} />
          <Pick label="Water" value={water} onChange={setWater} options={{ salt: "Salt water", fresh: "Fresh water" }} />
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="section-title !mb-1">Starting Point</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat value={`${est.leadLb.toFixed(0)} lb`} label="Lead (approx)" />
            <Stat value={`${est.leadKg.toFixed(1)} kg`} label="Lead (approx)" />
          </div>
          <div className="space-y-1">
            {est.breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="text-text-secondary">{b.label}</span>
                <span className={`tabular-nums ${b.lb >= 0 ? "text-surf" : "text-kelp"}`}>
                  {b.lb >= 0 ? "+" : ""}{b.lb.toFixed(1)} lb
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="glass-card-inner p-3 space-y-1">
        <Note>
          Target: hold a 5 m safety stop, near-empty tank, breath held at half-lung — that is
          where the weights have to balance you, not at the surface.
        </Note>
        <Note>Ballpark of &plusmn;2 kg / 5 lb at best: suit compression, body composition, and cylinder quirks all move it. Verify in shallow water before diving new gear.</Note>
      </div>
    </div>
  );
}

/* ================================ NO-FLY ================================ */

function NoFlyPanel() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {NO_FLY_GUIDANCE.map((g) => (
          <div key={g.category} className="glass-card p-4 sm:p-5 space-y-2">
            <p className="stat-label">{g.label}</p>
            <p className="text-3xl font-bold text-surf tabular-nums">{g.minSurfaceHours}h</p>
            <p className="text-[11px] sm:text-xs text-text-tertiary leading-relaxed">{g.detail}</p>
          </div>
        ))}
      </div>
      <div className="glass-card-inner p-3 space-y-1">
        <Note>
          DAN Flying After Diving workshop (2002) consensus for cabin altitudes of 2,000&ndash;8,000 ft.
          Mountain travel after diving counts as flying. When in doubt, stay another surface interval.
        </Note>
      </div>
    </div>
  );
}
