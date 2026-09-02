import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import {
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  SUIT_TYPE_LABELS,
  BOTTOM_TYPE_LABELS,
  BREATHING_GAS_LABELS,
  DECOMP_TYPE_LABELS,
  UNIT_SYSTEM_LABELS,
  pressureUnit,
  tempUnit,
  depthUnit,
  UnitSystem,
  DiveMode,
  DivePurpose,
  SuitType,
  BottomType,
  BreathingGas,
  DecompressionType,
} from "../lib/contracts";
import type { Attestation } from "../lib/types";
import { buildAttestationRequestParams } from "../lib/attestations";
import DiveProfileSketch from "../components/DiveProfileSketch";
import QRCode from "../components/QRCode";
import FlagChip from "../components/FlagChip";
import {
  ArrowLeft, Loader2, MapPin, Clock, Calendar, Thermometer, Eye, Wind, Droplets,
  ShieldCheck, AlertTriangle, Waves, Activity, Navigation, Copy, Check,
  Link2, Cylinder, QrCode,
} from "lucide-react";

const EXPLORERS: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};

interface DiveDetailProps {
  embedded?: boolean;
  diveId?: bigint;
}

export default function DiveDetail({ embedded, diveId: propDiveId }: DiveDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, chain } = useAccount();
  const { contractAddress } = useDiveContract();
  const {
    useDive, useVoidInfo, useAttestations, voidDive, isOwner, isPending, isConfirming, isSuccess,
  } = useDiveLog(contractAddress);

  const diveId = propDiveId ?? (id ? BigInt(id) : 0n);
  const { data: dive } = useDive(diveId);
  const { data: voidInfo } = useVoidInfo(diveId);
  const { data: attestations } = useAttestations(diveId);

  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [supersededBy, setSupersededBy] = useState("0");
  const [linkCopied, setLinkCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!dive) return null;
    const d = dive as Record<string, unknown>;
    const data = d.data as Record<string, unknown>;
    const env = d.env as Record<string, unknown>;
    const decomp = d.decomp as Record<string, unknown>;
    const gas = d.gas as Record<string, unknown>;
    const coords = env?.coords as { latitude: number; longitude: number } | undefined;
    const units = Number(d.units) as UnitSystem;
    return {
      d, data, env, decomp, gas, coords, units,
      isVoided: voidInfo ? (voidInfo as Record<string, unknown>).isVoided as boolean : false,
      maxDepth: Number(data?.maxDepth ?? 0),
      avgDepth: Number(data?.averageDepth ?? 0),
      bottomTime: Number(data?.bottomTimeMinutes ?? 0),
    };
  }, [dive, voidInfo]);

  if (!contractAddress) {
    return <div className="text-center py-20 text-text-secondary">No contract configured.</div>;
  }
  if (!dive || !parsed) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-bismuth/50 mx-auto mb-3 animate-spin" />
        <p className="text-text-secondary">Loading dive data…</p>
      </div>
    );
  }

  const { d, data, env, decomp, gas, coords, units, isVoided, maxDepth, avgDepth, bottomTime } = parsed;
  const dU = depthUnit(units), tU = tempUnit(units), pU = pressureUnit(units);
  const explorer = chain ? EXPLORERS[chain.id] ?? "" : "";

  const fmtDate = (ts: bigint) =>
    new Date(Number(ts) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const handleVoid = () => { voidDive(diveId, BigInt(supersededBy), voidReason); setShowVoidForm(false); };

  const gasLabel = BREATHING_GAS_LABELS[Number(gas?.gasType) as BreathingGas] ?? "Air";
  const o2Pct = Number(gas?.o2Percent ?? 21);
  const hePct = Number(gas?.hePercent ?? 0);
  const gasDisplay = gasLabel === "Nitrox" ? `Nitrox ${o2Pct}%` : gasLabel === "Trimix" ? `TMX ${o2Pct}/${hePct}` : gasLabel;

  const hasCoords = !!coords && (coords.latitude !== 0 || coords.longitude !== 0);
  const latDeg = coords ? (coords.latitude / 1e6) : 0;
  const lonDeg = coords ? (coords.longitude / 1e6) : 0;
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${latDeg},${lonDeg}` : "";
  const coordsStr = hasCoords ? `${latDeg.toFixed(4)}°, ${lonDeg.toFixed(4)}°` : "";

  const attList = (attestations as Attestation[] | undefined) ?? [];

  // Shareable attestation-request link for the owner
  const attParams = buildAttestationRequestParams({
    chainId: chain?.id ?? 0, contractAddress, diveId,
  });
  const attUrl = `${window.location.origin}/attest?${attParams.toString()}`;
  const copyLink = () => { navigator.clipboard?.writeText(attUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); };

  return (
    <div className={embedded ? "" : "max-w-5xl mx-auto animate-rise"}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-white transition-colors text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">Dive #{id ?? diveId.toString()}</h1>
          {isVoided && <span className="pill pill-danger">VOIDED</span>}
        </div>
      )}

      {/* Hero */}
      <div className="glass-card hairline overflow-hidden mb-4">
        <div className="relative h-44 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean via-navy to-abyss-deep" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22d3ee 0%, transparent 50%), radial-gradient(circle at 70% 30%, #0d9488 0%, transparent 50%)" }} />
          <div className="absolute inset-0 grid-overlay" style={{ position: "absolute" }} />
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Dive #{diveId.toString()}</h2>
                {Boolean(env?.location) && (
                  <p className="text-sm text-foam flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4" /> {String(env.location)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Mode</p>
                <p className="text-sm font-semibold text-white mt-0.5">{DIVE_MODE_LABELS[Number(data?.mode) as DiveMode] ?? "-"}</p>
                <div className="mt-1.5 flex justify-end">
                  <FlagChip mode={Number(data?.mode)} purpose={Number(data?.purpose)} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-text-secondary">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(d.diveDate as bigint)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {bottomTime} min</span>
              <span className="pill pill-teal">{DIVE_PURPOSE_LABELS[Number(data?.purpose) as DivePurpose] ?? "-"}</span>
              <span className="pill">{UNIT_SYSTEM_LABELS[units]}</span>
              {hasCoords && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="pill pill-surf hover:brightness-125">
                  <Navigation className="w-3 h-3" /> {coordsStr}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Metric icon={<Waves className="w-3.5 h-3.5" />} label="Max Depth" value={`${maxDepth}`} unit={dU} />
        <Metric icon={<Clock className="w-3.5 h-3.5" />} label="Bottom Time" value={`${bottomTime}`} unit="min" />
        <Metric icon={<Droplets className="w-3.5 h-3.5" />} label="Gas Mix" value={gasDisplay} small />
        <Metric icon={<Activity className="w-3.5 h-3.5" />} label="Avg Depth" value={`${avgDepth}`} unit={dU} />
      </div>

      {/* Profile sketch */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><Activity className="w-4 h-4" /> Dive Profile</div>
        <DiveProfileSketch dive={parsed.d as never} height={230} />
      </div>

      {/* Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="glass-card hairline p-5">
          <div className="section-title"><Thermometer className="w-4 h-4" /> Environment</div>
          <div className="grid grid-cols-2 gap-3">
            <Telemetry icon={<Thermometer className="w-3 h-3" />} label="Water Temp" value={`${env?.waterTemp ?? 0}${tU}`} />
            <Telemetry icon={<Wind className="w-3 h-3" />} label="Air Temp" value={`${env?.airTemp ?? 0}${tU}`} />
            <Telemetry icon={<Eye className="w-3 h-3" />} label="Bottom Type" value={BOTTOM_TYPE_LABELS[Number(env?.bottomType) as BottomType] ?? "-"} />
            <Telemetry icon={<Wind className="w-3 h-3" />} label="Current" value={`${Number(env?.currentKnots ?? 0)} kn`} />
            {Boolean(env?.weatherConditions) && <Telemetry icon={<Wind className="w-3 h-3" />} label="Weather" value={String(env?.weatherConditions)} />}
            {hasCoords && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="glass-card-inner p-3 no-underline hover:border-surf/30 transition-colors">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1"><Navigation className="w-3 h-3" /> Coordinates</p>
                <p className="text-sm font-medium text-surf mt-1">{coordsStr}</p>
              </a>
            )}
          </div>
        </div>

        <div className="glass-card hairline p-5">
          <div className="section-title"><Cylinder className="w-4 h-4" /> Equipment &amp; Gas</div>
          <div className="grid grid-cols-2 gap-3">
            <Telemetry icon={<Cylinder className="w-3 h-3" />} label="Suit" value={SUIT_TYPE_LABELS[Number(data?.suit) as SuitType] ?? "-"} />
            <Telemetry icon={<Droplets className="w-3 h-3" />} label="Gas" value={`${gasLabel} · O₂ ${o2Pct}%`} />
            <Telemetry icon={<Droplets className="w-3 h-3" />} label="Pressure In" value={`${gas?.cylinderPressureIn ?? 0} ${pU}`} />
            <Telemetry icon={<Droplets className="w-3 h-3" />} label="Pressure Out" value={`${gas?.cylinderPressureOut ?? 0} ${pU}`} />
            {decomp && Number(decomp.decompType) !== 0 && (
              <>
                <Telemetry icon={<AlertTriangle className="w-3 h-3" />} label="Deco" value={DECOMP_TYPE_LABELS[Number(decomp.decompType) as DecompressionType] ?? "-"} />
                <Telemetry icon={<Clock className="w-3 h-3" />} label="Deco Time" value={`${decomp.totalDecompTimeMinutes} min`} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Remarks */}
      {Boolean(d.remarks) && (
        <div className="glass-card hairline p-5 mb-4">
          <div className="section-title">Remarks</div>
          <p className="text-sm text-text-secondary leading-relaxed">{String(d.remarks)}</p>
        </div>
      )}

      {/* Attestations */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><ShieldCheck className="w-4 h-4" /> Buddy Attestations ({attList.length})</div>

        {attList.length > 0 ? (
          <div className="space-y-2 mb-4">
            {attList.map((a, i) => (
              <div key={i} className="glass-card-inner p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-kelp/10 border border-kelp/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-kelp" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {explorer ? (
                      <a href={`${explorer}/address/${a.attester}`} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-white hover:text-surf no-underline">
                        {a.attester.slice(0, 6)}…{a.attester.slice(-4)}
                      </a>
                    ) : (
                      <span className="text-sm font-mono text-white">{a.attester.slice(0, 6)}…{a.attester.slice(-4)}</span>
                    )}
                    <span className="pill pill-kelp"><ShieldCheck className="w-3 h-3" /> EIP-712</span>
                    <span className="pill">nonce {a.nonce.toString()}</span>
                    <Link to={`/diver/${a.attester}`} className="pill pill-surf no-underline hover:brightness-125">
                      <Link2 className="w-3 h-3" /> profile
                    </Link>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    {new Date(Number(a.attestedAt) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card-inner p-4 text-center mb-4">
            <ShieldCheck className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
            <p className="text-xs text-text-tertiary">No buddy attestations yet</p>
          </div>
        )}

        {/* Request attestation (QR for the buddy to scan + copyable link) */}
        {!isVoided && address && (
          <div className="glass-card-inner p-4 border-surf/15">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-surf" />
              <p className="text-xs font-semibold text-white">Ask your buddy to sign this dive</p>
            </div>
            <p className="text-[11px] text-text-tertiary mb-3 leading-snug">
              They scan the QR, sign an EIP-712 message on their own wallet. Free, no gas, and the
              attestation is recorded on-chain. Works between phones, even mid-boat.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <QRCode value={attUrl} size={132} />
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2">
                  <input readOnly value={attUrl} className="font-mono text-[11px] !py-2" />
                  <button onClick={copyLink} className="btn-outline text-xs shrink-0">
                    {linkCopied ? <><Check className="w-3.5 h-3.5 text-kelp" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <p className="text-[10px] text-text-tertiary mt-2">
                  Signed attestations can also be relayed by anyone. Including you with your next entry.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Void info */}
      {isVoided && Boolean(voidInfo) && (
        <div className="glass-card-inner p-4 space-y-1 border-danger/20 mb-4">
          <p className="text-danger font-medium text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> This dive has been voided</p>
          <p className="text-xs text-text-secondary">Reason: {String((voidInfo as Record<string, unknown>).reason)}</p>
          {Boolean((voidInfo as Record<string, unknown>).supersededById) && (
            <p className="text-xs text-text-secondary">
              Superseded by{" "}
              <Link to={`/logbook/${((voidInfo as Record<string, unknown>).supersededById as bigint).toString()}`} className="text-surf underline">
                Dive #{((voidInfo as Record<string, unknown>).supersededById as bigint).toString()}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Owner void action */}
      {isOwner && !isVoided && (
        <div className="mb-4">
          {!showVoidForm ? (
            <button onClick={() => setShowVoidForm(true)} className="text-xs text-danger/70 hover:text-danger transition-colors flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Void this dive
            </button>
          ) : (
            <div className="glass-card-inner p-4 space-y-3 border-danger/20">
              <input type="text" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason for voiding" />
              <input type="number" value={supersededBy} onChange={(e) => setSupersededBy(e.target.value)} placeholder="Superseded by dive ID (0 = none)" />
              <div className="flex gap-2">
                <button onClick={handleVoid} disabled={isPending || isConfirming || !voidReason} className="px-4 py-2 bg-danger/80 hover:bg-danger text-white text-sm rounded-lg disabled:opacity-50">
                  {isPending ? "Confirm…" : isConfirming ? "Voiding…" : "Confirm Void"}
                </button>
                <button onClick={() => setShowVoidForm(false)} className="px-4 py-2 text-text-secondary text-sm">Cancel</button>
              </div>
              {isSuccess && <p className="text-sm text-kelp">Dive voided.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, unit, small }: { icon: React.ReactNode; label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div className="stat-box">
      <div className="stat-label flex items-center gap-1">{icon} {label}</div>
      <p className={`stat-value text-surf ${small ? "text-base" : ""}`}>
        {value}{unit && <span className="text-sm font-normal text-text-tertiary ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function Telemetry({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card-inner p-3">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm font-medium text-white mt-1">{value}</p>
    </div>
  );
}
