import { useMemo } from "react";
import type { NormalizedDive } from "../lib/diverStats";
import { depthUnit, tenthsToDepth, UnitSystem, DecompressionType } from "../lib/contracts";

interface SketchPoint {
  t: number; // minutes from start
  d: number; // depth, 0 = surface
}

interface DiveProfileSketchProps {
  dive: NormalizedDive;
  height?: number;
}

/**
 * Time-depth profile sketch, drawn from the v2 header (times, depths) plus the
 * local profile draft when present, clearly labeled ESTIMATED. When real
 * telemetry (UDDF dive-computer samples) lands, this component renders those
 * instead.
 *
 * Y axis is inverted (depth grows downward), X is run time in minutes.
 */
export default function DiveProfileSketch({ dive, height = 220 }: DiveProfileSketchProps) {
  const W = 640;
  const H = height;
  const PAD_L = 42;
  const PAD_R = 14;
  const PAD_T = 14;
  const PAD_B = 26;

  const { points, decoStops, totalTime, maxDepth, isEstimated } = useMemo(() => {
    const draft = dive.draft;
    const durationSec = Number(dive.durationSeconds) || 1;
    const btSec = Number(dive.bottomTimeSeconds) > 0 ? Number(dive.bottomTimeSeconds) : durationSec;
    const bt = Math.max(1, btSec / 60);
    const deco =
      draft && Number(draft.decomp.totalDecompTimeMinutes) > 0
        ? Number(draft.decomp.totalDecompTimeMinutes)
        : Math.max(0, (durationSec - btSec) / 60);
    const decompType = draft ? Number(draft.decomp.decompType) : DecompressionType.NoneDecomp;
    const max = tenthsToDepth(Number(dive.maxDepth)) || 1;
    const avg = draft && Number(draft.data.averageDepth) > 0 ? Number(draft.data.averageDepth) : Math.round(max * 0.7);

    // Total from the header's surface-to-surface duration beats synthesized
    // figures; deco/ascent appended when the header only knows bottom time.
    const total = Math.max(durationSec / 60, bt + deco + 1.5);

    const descendMin = Math.min(3, bt * 0.12);
    const btEnd = Math.min(bt, total - deco - 0.75);

    const pts: SketchPoint[] = [{ t: 0, d: 0 }];
    pts.push({ t: descendMin, d: max });
    // Gentle meander between avg and max during bottom time
    const midPoints = 6;
    for (let i = 1; i <= midPoints; i++) {
      const frac = i / (midPoints + 1);
      pts.push({
        t: descendMin + (btEnd - descendMin) * frac,
        d: max - (max - avg) * (0.4 + 0.6 * Math.abs(Math.sin(i * 2.1))),
      });
    }
    pts.push({ t: btEnd, d: Math.min(max, avg + (max - avg) * 0.4) });

    const stops: SketchPoint[] = [];
    if (decompType !== DecompressionType.NoneDecomp && deco > 0) {
      const riseEnd = btEnd + deco * 0.45;
      const plateauEnd = Math.min(btEnd + deco * 0.95, total - 0.75);
      pts.push({ t: riseEnd, d: 5 });
      stops.push({ t: (riseEnd + plateauEnd) / 2, d: 5 });
      pts.push({ t: plateauEnd, d: 5 });
    }
    pts.push({ t: total, d: 0 });

    return {
      points: pts,
      decoStops: stops,
      totalTime: total,
      maxDepth: max,
      isEstimated: true, // sketched from summary data, not telemetry
    };
  }, [dive]);

  const units = Number(dive.units) as UnitSystem;
  const dU = depthUnit(units);

  const x = (t: number) => PAD_L + (t / totalTime) * (W - PAD_L - PAD_R);
  const y = (d: number) => PAD_T + (d / (maxDepth * 1.15)) * (H - PAD_T - PAD_B);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.d).toFixed(1)}`).join(" ");
  const area = `${path} L${x(totalTime).toFixed(1)},${y(0).toFixed(1)} L${PAD_L},${y(0).toFixed(1)} Z`;

  const depthTicks = useMemo(() => {
    const step = maxDepth > 40 ? 20 : maxDepth > 18 ? 10 : 5;
    const ticks: number[] = [];
    for (let d = step; d <= maxDepth * 1.15; d += step) ticks.push(d);
    return ticks;
  }, [maxDepth]);

  const timeStep = totalTime > 60 ? 15 : totalTime > 30 ? 10 : 5;
  const timeTicks: number[] = [];
  for (let t = timeStep; t < totalTime; t += timeStep) timeTicks.push(t);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Dive profile sketch (estimated)"
      >
        <defs>
          <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.03} />
          </linearGradient>
        </defs>

        {/* depth grid */}
        {depthTicks.map((d) => (
          <g key={`d${d}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(d)}
              y2={y(d)}
              stroke="rgba(45,139,186,0.14)"
              strokeDasharray="3 4"
            />
            <text x={PAD_L - 8} y={y(d) + 3.5} textAnchor="end" fontSize={10} fill="#5c748a">
              {d}
            </text>
          </g>
        ))}
        <text x={10} y={PAD_T + 4} fontSize={10} fill="#5c748a">{dU}</text>

        {/* time ticks */}
        {timeTicks.map((t) => (
          <text key={`t${t}`} x={x(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="#5c748a">
            {t}
          </text>
        ))}
        <text x={W - PAD_R} y={H - 8} textAnchor="end" fontSize={10} fill="#5c748a">min</text>

        {/* profile */}
        <path d={area} fill="url(#profileFill)" />
        <path d={path} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinejoin="round" />

        {/* deco stops */}
        {decoStops.map((s, i) => (
          <g key={i}>
            <circle cx={x(s.t)} cy={y(s.d)} r={4.5} fill="#fbbf24" stroke="#02070d" strokeWidth={1.5} />
            <text x={x(s.t)} y={y(s.d) - 9} textAnchor="middle" fontSize={10} fill="#fbbf24">
              deco
            </text>
          </g>
        ))}

        {/* surface line */}
        <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="rgba(103,232,249,0.4)" strokeWidth={1} />
      </svg>
      {isEstimated && (
        <p className="text-[10px] text-text-tertiary text-center mt-1">
          Estimated from the on-chain header · actual profile curve arrives with dive-computer import
        </p>
      )}
    </div>
  );
}
