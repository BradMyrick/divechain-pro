import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import {
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  SUIT_TYPE_LABELS,
  BREATHING_GAS_LABELS,
  DECOMP_TYPE_LABELS,
  UNIT_SYSTEM_LABELS,
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BreathingGas,
  DecompressionType,
  BottomType,
  BOTTOM_TYPE_LABELS,
} from "../lib/contracts";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Clock,
  Calendar,
  Thermometer,
  Eye,
  Wind,
  Droplets,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Weight,
  Cylinder,
  Waves,
  Activity,
  Compass,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DiveDetailProps {
  embedded?: boolean;
  diveId?: bigint;
}

export default function DiveDetail({ embedded, diveId: propDiveId }: DiveDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contractAddress } = useDiveContract();
  const {
    useDive,
    useVoidInfo,
    useAttestations,
    voidDive,
    isOwner,
    isPending,
    isConfirming,
    isSuccess,
  } = useDiveLog(contractAddress);

  const diveId = propDiveId ?? (id ? BigInt(id) : 0n);
  const { data: dive } = useDive(diveId);
  const { data: voidInfo } = useVoidInfo(diveId);
  const { data: attestations } = useAttestations(diveId);

  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [supersededBy, setSupersededBy] = useState("0");

  const parsedDive = useMemo(() => {
    if (!dive) return null;
    const d = dive as Record<string, unknown>;
    const data = d.data as Record<string, unknown>;
    const env = d.env as Record<string, unknown>;
    const decomp = d.decomp as Record<string, unknown>;
    const gas = d.gas as Record<string, unknown>;
    const isVoided = voidInfo ? (voidInfo as Record<string, unknown>).isVoided as boolean : false;
    const depthUnit = UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] === "Metric" ? "m" : "ft";
    const tempUnit = UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] === "Metric" ? "\u00B0C" : "\u00B0F";
    const maxDepth = Number(data?.maxDepth ?? 0);
    const avgDepth = Number(data?.averageDepth ?? 0);
    const bottomTime = Number(data?.bottomTimeMinutes ?? 0);
    return { d, data, env, decomp, gas, isVoided, depthUnit, tempUnit, maxDepth, avgDepth, bottomTime };
  }, [dive, voidInfo]);

  const diveProfileData = useMemo(() => {
    if (!parsedDive) return [];
    const { maxDepth, avgDepth, bottomTime } = parsedDive;
    const points = [];
    const steps = Math.max(20, bottomTime);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let depth: number;
      if (t < 0.1) {
        depth = maxDepth * (t / 0.1);
      } else if (t < 0.25) {
        depth = maxDepth + (avgDepth - maxDepth) * ((t - 0.1) / 0.15);
      } else if (t < 0.75) {
        const wave = Math.sin((t - 0.25) * 12) * (maxDepth * 0.05);
        depth = avgDepth + wave;
      } else {
        depth = avgDepth * (1 - (t - 0.75) / 0.25);
      }
      depth = Math.max(0, depth);
      points.push({
        time: Math.round((t * bottomTime) * 10) / 10,
        depth: Math.round(depth * 10) / 10,
      });
    }
    return points;
  }, [parsedDive]);

  if (!contractAddress) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No contract configured.</p>
      </div>
    );
  }

  if (!dive || !parsedDive) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-bismuth/50 mx-auto mb-3 animate-spin" />
        <p className="text-text-secondary">Loading dive data...</p>
      </div>
    );
  }

  const { d, data, env, decomp, gas, isVoided, depthUnit, tempUnit, maxDepth, bottomTime } = parsedDive;
  const { avgDepth } = parsedDive;

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleVoid = () => {
    voidDive(diveId, BigInt(supersededBy), voidReason);
    setShowVoidForm(false);
  };

  const gasLabel = BREATHING_GAS_LABELS[Number(gas?.gasType) as BreathingGas] ?? "Air";
  const o2Pct = Number(gas?.o2Percent ?? 21);
  const hePct = Number(gas?.hePercent ?? 0);
  const gasDisplay = gasLabel === "Nitrox" ? `Nitrox ${o2Pct}%` : gasLabel === "Trimix" ? `Trimix ${o2Pct}/${hePct}` : gasLabel;

  return (
    <div className={embedded ? "" : "max-w-5xl mx-auto"}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-text-secondary hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">Dive #{id ?? diveId.toString()}</h1>
          {isVoided && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-danger/20 text-danger border border-danger/30">
              VOIDED
            </span>
          )}
        </div>
      )}

      {/* Hero Section */}
      <div className="glass-card overflow-hidden mb-4">
        <div className="relative h-40 bg-gradient-to-br from-ocean via-navy to-deep overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #22d3ee 0%, transparent 50%), radial-gradient(circle at 70% 30%, #0d9488 0%, transparent 50%)' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Dive #{diveId.toString()}
                </h2>
                {Boolean(env?.location) && (
                  <p className="text-sm text-surf/80 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4" /> {String(env.location)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Mode</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {DIVE_MODE_LABELS[Number(data?.mode) as DiveMode] ?? "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {formatDate(d.diveDate as bigint)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {bottomTime} min
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                {DIVE_PURPOSE_LABELS[Number(data?.purpose) as DivePurpose] ?? "Unknown"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy/40 text-text-tertiary border border-card-border">
                {UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] ?? "Unknown"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="stat-box">
          <div className="stat-label flex items-center gap-1">
            <Waves className="w-3.5 h-3.5" /> Max Depth
          </div>
          <p className="stat-value text-surf">{maxDepth}<span className="text-sm font-normal text-text-tertiary ml-1">{depthUnit}</span></p>
        </div>
        <div className="stat-box">
          <div className="stat-label flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Bottom Time
          </div>
          <p className="stat-value text-surf">{bottomTime}<span className="text-sm font-normal text-text-tertiary ml-1">min</span></p>
        </div>
        <div className="stat-box">
          <div className="stat-label flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5" /> Gas Mix
          </div>
          <p className="stat-value text-surf text-xl">{gasDisplay}</p>
        </div>
        <div className="stat-box">
          <div className="stat-label flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Avg Depth
          </div>
          <p className="stat-value text-surf">{avgDepth}<span className="text-sm font-normal text-text-tertiary ml-1">{depthUnit}</span></p>
        </div>
      </div>

      {/* Dive Profile Chart */}
      <div className="glass-card p-5 mb-4">
        <div className="section-title flex items-center gap-2">
          <Activity className="w-4 h-4 text-surf" /> Dive Profile
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={diveProfileData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(45, 139, 186, 0.1)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#8b9eb0', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(45, 139, 186, 0.2)' }}
                tickLine={false}
                label={{ value: 'Time (min)', position: 'insideBottomRight', offset: -5, fill: '#4a6a80', fontSize: 10 }}
              />
              <YAxis
                reversed
                domain={[0, 'dataMax + 5']}
                tick={{ fill: '#8b9eb0', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(45, 139, 186, 0.2)' }}
                tickLine={false}
                label={{ value: `Depth (${depthUnit})`, angle: -90, position: 'insideTopLeft', offset: 15, fill: '#4a6a80', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b1722',
                  border: '1px solid rgba(45, 139, 186, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#8b9eb0' }}
                formatter={(value: unknown) => [`${value} ${depthUnit}`, 'Depth']}
                labelFormatter={(label: unknown) => `Time: ${label} min`}
              />
              <Area
                type="monotone"
                dataKey="depth"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#depthGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0b1722', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Telemetry Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Environment */}
        <div className="glass-card p-5">
          <div className="section-title flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-teal" /> Environment
          </div>
          <div className="grid grid-cols-2 gap-3">
            {env && String(env.waterTemp ?? "") && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Water Temp
                </p>
                <p className="text-lg font-bold text-white mt-1">{String(env.waterTemp)}{tempUnit}</p>
              </div>
            )}
            {env && String(env.airTemp ?? "") && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Wind className="w-3 h-3" /> Air Temp
                </p>
                <p className="text-lg font-bold text-white mt-1">{String(env.airTemp)}{tempUnit}</p>
              </div>
            )}
            {env && env.bottomType !== undefined && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Bottom Type
                </p>
                <p className="text-sm font-medium text-white mt-1">{BOTTOM_TYPE_LABELS[Number(env.bottomType) as BottomType] ?? "Unknown"}</p>
              </div>
            )}
            {env && String(env.weatherConditions ?? "") && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Weather
                </p>
                <p className="text-sm font-medium text-white mt-1">{String(env.weatherConditions)}</p>
              </div>
            )}
            {env && Boolean(env.coords) && (
              <div className="glass-card-inner p-3 col-span-1 sm:col-span-2">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3 h-3" /> GPS Coordinates
                </p>
                <p className="text-sm font-medium text-white mt-1 font-mono">
                  {(Number((env.coords as any).latitude) / 1e6).toFixed(6)}, {(Number((env.coords as any).longitude) / 1e6).toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Equipment Log */}
        <div className="glass-card p-5">
          <div className="section-title flex items-center gap-2">
            <Cylinder className="w-4 h-4 text-teal" /> Equipment Log
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card-inner p-3">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                <Weight className="w-3 h-3" /> Suit Type
              </p>
              <p className="text-sm font-medium text-white mt-1">
                {SUIT_TYPE_LABELS[Number(data?.suit) as SuitType] ?? "N/A"}
              </p>
            </div>
            {gas && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Droplets className="w-3 h-3" /> Gas
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  {BREATHING_GAS_LABELS[Number(gas.gasType) as BreathingGas] ?? "N/A"}
                  <span className="text-text-tertiary ml-1 text-xs">O2: {String(gas.o2Percent)}%</span>
                </p>
              </div>
            )}
            {decomp && Number(decomp.decompType) !== 0 && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Deco Type
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  {DECOMP_TYPE_LABELS[Number(decomp.decompType) as DecompressionType] ?? "N/A"}
                </p>
              </div>
            )}
            {decomp && Number(decomp.decompType) !== 0 && (
              <div className="glass-card-inner p-3">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Deco Time
                </p>
                <p className="text-sm font-medium text-white mt-1">{String(decomp.totalDecompTimeMinutes)} min</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remarks */}
      {String(d.remarks ?? "") && (
        <div className="glass-card p-5 mb-4">
          <div className="section-title">Remarks</div>
          <p className="text-sm text-text-secondary leading-relaxed">{String(d.remarks)}</p>
        </div>
      )}

      {/* Web3 / Attestation Module */}
      <div className="glass-card p-5 mb-4 border-teal/10">
        <div className="section-title flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-kelp" /> Buddy Attestations
        </div>

        {attestations && Array.isArray(attestations) && (attestations as unknown[]).length > 0 ? (
          <div className="space-y-2">
            {(attestations as Record<string, unknown>[]).map((a, i) => (
              <div key={i} className="glass-card-inner p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-kelp/10 border border-kelp/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-kelp" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-white">
                      {String(a.attester).slice(0, 6)}...{String(a.attester).slice(-4)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-kelp/10 text-kelp border border-kelp/20 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> EIP-712 Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    {new Date(Number(a.attestedAt) * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={`https://snowtrace.io/tx/${String(a.txHash ?? "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-bismuth hover:text-surf flex items-center gap-1 transition-colors no-underline"
                >
                  <ExternalLink className="w-3 h-3" /> Explorer
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card-inner p-4 text-center">
            <ShieldCheck className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
            <p className="text-xs text-text-tertiary">No buddy attestations yet</p>
          </div>
        )}
      </div>

      {/* Void Info / Void Form */}
      {isVoided && Boolean(voidInfo) && (
        <div className="glass-card-inner p-4 space-y-1 border-danger/20 mb-4">
          <p className="text-danger font-medium text-sm flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> This dive has been voided
          </p>
          <p className="text-xs text-text-secondary">Reason: {String((voidInfo as Record<string, unknown>).reason)}</p>
          {Boolean((voidInfo as Record<string, unknown>).supersededById) && (
            <p className="text-xs text-text-secondary">
              Superseded by:{" "}
              <Link
                to={`/logbook/${((voidInfo as Record<string, unknown>).supersededById as bigint).toString()}`}
                className="text-surf underline"
              >
                Dive #{((voidInfo as Record<string, unknown>).supersededById as bigint).toString()}
              </Link>
            </p>
          )}
        </div>
      )}

      {isOwner && !isVoided && (
        <div className="mb-4">
          {!showVoidForm ? (
            <button
              onClick={() => setShowVoidForm(true)}
              className="text-xs text-danger/60 hover:text-danger transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" /> Void this dive
            </button>
          ) : (
            <div className="glass-card-inner p-4 space-y-3 border-danger/20">
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason for voiding"
              />
              <input
                type="number"
                value={supersededBy}
                onChange={(e) => setSupersededBy(e.target.value)}
                placeholder="Superseded by dive ID (0 = none)"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleVoid}
                  disabled={isPending || isConfirming || !voidReason}
                  className="px-4 py-2 bg-danger/80 text-white text-sm rounded-lg disabled:opacity-50"
                >
                  {isPending ? "Confirm..." : isConfirming ? "Voiding..." : "Confirm Void"}
                </button>
                <button onClick={() => setShowVoidForm(false)} className="px-4 py-2 text-text-secondary text-sm">
                  Cancel
                </button>
              </div>
              {isSuccess && <p className="text-sm text-kelp">Dive voided.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}
