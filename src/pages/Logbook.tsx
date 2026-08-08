import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import DiveDetail from "./DiveDetail";
import { BookOpen, Plus, FileText, MapPin, Clock, ShieldCheck } from "lucide-react";
import {
  DIVE_MODE_LABELS,
  depthUnit,
  DiveMode,
  UnitSystem,
} from "../lib/contracts";

export default function Logbook() {
  const navigate = useNavigate();
  const { hasContract, contractAddress } = useDiveContract();
  const { diveCount, allDiveIds, isOwner } = useDiveLog(contractAddress);
  const [selectedDiveId, setSelectedDiveId] = useState<bigint | null>(null);

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No dive log found</h2>
          <p className="text-sm text-text-secondary mb-6">Deploy your sovereign dive logbook to get started.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Create Dive Log</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 -mx-3 sm:-mx-6 lg:-mx-8 -mt-1 -mb-4 sm:-mt-2 sm:-mb-6 lg:-mt-4 lg:-mb-8">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Logbook
            {isOwner && <span className="pill pill-kelp text-[9px] py-0">owner</span>}
          </h1>
          <p className="text-xs text-text-tertiary font-mono mt-0.5">{contractAddress}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="stat-box px-4 py-2 flex-row items-center gap-2">
            <span className="text-lg font-bold text-surf tabular-nums">{diveCount !== undefined ? diveCount.toString() : "--"}</span>
            <span className="text-[10px] text-text-tertiary uppercase">dives</span>
          </div>
          {isOwner && (
            <button onClick={() => navigate("/log-dive")} className="btn-primary text-sm px-4 py-2">
              <Plus className="w-4 h-4" /> Log Dive
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 border-r border-card-border overflow-y-auto custom-scrollbar">
          {!allDiveIds || allDiveIds.length === 0 ? (
            <div className="text-center py-20 px-6">
              <FileText className="w-12 h-12 text-bismuth/50 mx-auto mb-4 animate-[float-y_3s_ease-in-out_infinite]" />
              <h3 className="text-lg font-semibold text-white mb-2">No dives yet</h3>
              <p className="text-sm text-text-secondary mb-6">Time to get wet. Log your first dive.</p>
              {isOwner && <button onClick={() => navigate("/log-dive")} className="btn-primary">Log Your First Dive</button>}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {allDiveIds.map((id) => (
                <DiveListItem
                  key={id.toString()}
                  contractAddress={contractAddress!}
                  diveId={id}
                  isSelected={selectedDiveId === id}
                  onSelect={() => setSelectedDiveId(id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:flex flex-1 overflow-y-auto custom-scrollbar">
          {selectedDiveId ? (
            <DiveDetail embedded diveId={selectedDiveId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-bismuth/30 mx-auto mb-3" />
                <p className="text-sm text-text-tertiary">Select a dive to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedDiveId && (
        <div className="lg:hidden fixed inset-0 top-14 bg-abyss z-40 overflow-y-auto">
          <div className="p-4">
            <button onClick={() => setSelectedDiveId(null)} className="text-sm text-text-secondary hover:text-white flex items-center gap-1 mb-4">
              Back to list
            </button>
            <DiveDetail embedded diveId={selectedDiveId} />
          </div>
        </div>
      )}
    </div>
  );
}

function DiveListItem({
  contractAddress, diveId, isSelected, onSelect,
}: {
  contractAddress: `0x${string}`;
  diveId: bigint;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { useDive, useVoidInfo, useAttestations } = useDiveLog(contractAddress);
  const { data: dive } = useDive(diveId);
  const { data: voidInfo } = useVoidInfo(diveId);
  const { data: attestations } = useAttestations(diveId);

  if (!dive) {
    return (
      <div className="glass-card p-3 animate-pulse">
        <div className="h-3 bg-navy/50 rounded w-1/3 mb-2" />
        <div className="h-3 bg-navy/50 rounded w-2/3" />
      </div>
    );
  }

  const d = dive as Record<string, unknown>;
  const data = d.data as Record<string, unknown>;
  const env = d.env as Record<string, unknown>;
  const isVoided = voidInfo ? (voidInfo as Record<string, unknown>).isVoided as boolean : false;
  const attCount = attestations && Array.isArray(attestations) ? (attestations as unknown[]).length : 0;
  const units = Number(d.units ?? 0) as UnitSystem;
  const dU = depthUnit(units);

  const fmt = (ts: bigint) => new Date(Number(ts) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left glass-card p-3 transition-all cursor-pointer ${isSelected ? "border-surf/40 bg-navy/20 shadow-md shadow-surf/5" : "hover:border-card-border-bright"
        } ${isVoided ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-sm font-semibold text-white">Dive #{diveId.toString()}</p>
          <p className="text-[11px] text-text-tertiary flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {fmt(d.diveDate as bigint)}</p>
        </div>
        {attCount > 0 ? (
          <span className="flex items-center gap-0.5 text-[10px] text-kelp bg-kelp/10 px-1.5 py-0.5 rounded-full border border-kelp/20">
            <ShieldCheck className="w-3 h-3" /> {attCount}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-white font-medium tabular-nums">{String(data?.maxDepth ?? 0)}{dU}</span>
        <span className="text-text-tertiary tabular-nums">{String(data?.bottomTimeMinutes ?? 0)}min</span>
        <span className="pill text-[9px] py-0">{DIVE_MODE_LABELS[Number(data?.mode) as DiveMode] ?? "-"}</span>
      </div>
      {Boolean(env?.location) && (
        <p className="text-[11px] text-text-tertiary mt-1.5 truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {String(env.location)}</p>
      )}
      {isVoided && <span className="pill pill-danger text-[9px] py-0 mt-1.5">VOIDED</span>}
    </button>
  );
}
