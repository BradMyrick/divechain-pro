import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
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
} from "../lib/contracts";
import { ArrowLeftIcon, ArrowPathIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

export default function DiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contractAddress } = useDiveContract();
  const { useDive, useVoidInfo, useAttestations, voidDive, isOwner, isPending, isConfirming, isSuccess } = useDiveLog(contractAddress);

  const diveId = id ? BigInt(id) : 0n;
  const { data: dive } = useDive(diveId);
  const { data: voidInfo } = useVoidInfo(diveId);
  const { data: attestations } = useAttestations(diveId);

  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [supersededBy, setSupersededBy] = useState("0");

  if (!contractAddress) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">No contract configured.</p>
      </div>
    );
  }

  if (!dive) {
    return (
      <div className="text-center py-20">
        <ArrowPathIcon className="w-8 h-8 text-bismuth/50 mx-auto mb-3 animate-spin" />
        <p className="text-gray-400">Loading dive...</p>
      </div>
    );
  }

  const d = dive as Record<string, unknown>;
  const data = d.data as Record<string, unknown>;
  const env = d.env as Record<string, unknown>;
  const decomp = d.decomp as Record<string, unknown>;
  const gas = d.gas as Record<string, unknown>;
  const isVoided = voidInfo ? (voidInfo as Record<string, unknown>).isVoided as boolean : false;

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

  const depthUnit = UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] === "Metric" ? "meters" : "feet";
  const tempUnit = UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] === "Metric" ? "\u00B0C" : "\u00B0F";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-white">Dive #{id}</h1>
        {isVoided && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-danger/20 text-danger border border-danger/30">
            VOIDED
          </span>
        )}
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{String(data?.maxDepth ?? 0)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{depthUnit} depth</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{String(data?.bottomTimeMinutes ?? 0)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">bottom min</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{String(data?.averageDepth ?? 0)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">avg depth</p>
          </div>
          <div className="stat-box">
            <p className="text-2xl font-bold text-surf">{attestations && Array.isArray(attestations) ? (attestations as unknown[]).length : 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">attested</p>
          </div>
        </div>

        <div className="depth-line pl-4 space-y-3">
          <DetailRow label="Date" value={formatDate(d.diveDate as bigint)} />
          <DetailRow label="Mode" value={DIVE_MODE_LABELS[Number(data?.mode) as DiveMode] ?? "-"} />
          <DetailRow label="Purpose" value={DIVE_PURPOSE_LABELS[Number(data?.purpose) as DivePurpose] ?? "-"} />
          <DetailRow label="Suit" value={SUIT_TYPE_LABELS[Number(data?.suit) as SuitType] ?? "-"} />
          <DetailRow label="Units" value={UNIT_SYSTEM_LABELS[Number(d.units) as UnitSystem] ?? "-"} />
        </div>

        {env && (String(env.location ?? "") || String(env.waterTemp ?? "") || String(env.airTemp ?? "")) && (
          <div>
            <div className="section-title">Environment</div>
            <div className="space-y-3 pl-2">
              {String(env.location ?? "") && <DetailRow label="Location" value={String(env.location)} />}
              {String(env.bottomType ?? "") && <DetailRow label="Bottom" value={String(env.bottomType)} />}
              <DetailRow label="Water Temp" value={`${String(env.waterTemp)}${tempUnit}`} />
              <DetailRow label="Air Temp" value={`${String(env.airTemp)}${tempUnit}`} />
              {String(env.weatherConditions ?? "") && <DetailRow label="Weather" value={String(env.weatherConditions)} />}
            </div>
          </div>
        )}

        {gas && (
          <div>
            <div className="section-title">Gas</div>
            <div className="space-y-3 pl-2">
              <DetailRow label="Type" value={BREATHING_GAS_LABELS[Number(gas.gasType) as BreathingGas] ?? "-"} />
              <DetailRow label="O2" value={`${gas.o2Percent}%`} />
              <DetailRow label="He" value={`${gas.hePercent}%`} />
            </div>
          </div>
        )}

        {decomp && Number(decomp.decompType) !== 0 && (
          <div>
            <div className="section-title">Decompression</div>
            <div className="space-y-3 pl-2">
              <DetailRow label="Type" value={DECOMP_TYPE_LABELS[Number(decomp.decompType) as DecompressionType] ?? "-"} />
              <DetailRow label="Total Deco Time" value={`${decomp.totalDecompTimeMinutes} min`} />
            </div>
          </div>
        )}

        {String(d.remarks ?? "") && (
          <div>
            <div className="section-title">Remarks</div>
            <p className="text-sm text-gray-400 pl-2">{String(d.remarks)}</p>
          </div>
        )}

        {attestations && Array.isArray(attestations) && (attestations as unknown[]).length > 0 ? (
          <div>
            <div className="section-title">Buddy Attestations</div>
            <div className="space-y-2 pl-2">
              {(attestations as Record<string, unknown>[]).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm glass-card-inner px-3 py-2">
                  <CheckBadgeIcon className="w-4 h-4 text-kelp" />
                  <span className="text-gray-300 font-mono text-xs">
                    {String(a.attester).slice(0, 6)}...{String(a.attester).slice(-4)}
                  </span>
                  <span className="text-gray-500 text-xs ml-auto">
                    {new Date(Number(a.attestedAt) * 1000).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isOwner && !isVoided && (
          <div className="pt-2">
            {!showVoidForm ? (
              <button
                onClick={() => setShowVoidForm(true)}
                className="text-xs text-danger/60 hover:text-danger transition-colors"
              >
                Void this dive
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
                  <button onClick={() => setShowVoidForm(false)} className="px-4 py-2 text-gray-400 text-sm">
                    Cancel
                  </button>
                </div>
                {isSuccess && <p className="text-sm text-kelp">Dive voided.</p>}
              </div>
            )}
          </div>
        )}

        {isVoided && Boolean(voidInfo) && (
          <div className="glass-card-inner p-4 space-y-1 border-danger/20">
            <p className="text-danger font-medium text-sm">This dive has been voided</p>
            <p className="text-xs text-gray-400">Reason: {String((voidInfo as Record<string, unknown>).reason)}</p>
            {Boolean((voidInfo as Record<string, unknown>).supersededById) && (
              <p className="text-xs text-gray-400">
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
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}
