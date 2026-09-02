import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useLogbookData } from "../hooks/useLogbook";
import DiveDetail from "./DiveDetail";
import FlagChip from "../components/FlagChip";
import { computeDiverStats, formatMinutes, type NormalizedDive } from "../lib/diverStats";
import { depthUnit, UnitSystem } from "../lib/contracts";
import { BookOpen, Plus, FileText, MapPin, Clock, ShieldCheck, Waves, Activity } from "lucide-react";

export default function Logbook() {
  const navigate = useNavigate();
  const { hasContract, contractAddress } = useDiveContract();
  const { dives, isLoading } = useLogbookData(contractAddress);
  const stats = computeDiverStats(dives);
  const [selectedDiveId, setSelectedDiveId] = useState<bigint | null>(null);

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No logbook found</h2>
          <p className="text-sm text-text-secondary mb-6">Claim your sovereign dive logbook to get started.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Claim Your Logbook</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 -mx-3 sm:-mx-6 lg:-mx-8 -mt-1 -mb-4 sm:-mt-2 sm:-mb-6 lg:-mt-4 lg:-mb-8">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">Logbook</h1>
          <p className="text-xs text-text-tertiary font-mono mt-0.5 truncate">{contractAddress}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:grid grid-cols-3 gap-2">
            <MiniStat icon={<BookOpen className="w-3 h-3" />} value={String(stats.totalDives)} label="dives" />
            <MiniStat icon={<Clock className="w-3 h-3" />} value={formatMinutes(stats.totalBottomMinutes)} label="bottom" />
            <MiniStat icon={<ShieldCheck className="w-3 h-3" />} value={`${Math.round(stats.attestationCoverage * 100)}%`} label="attested" />
          </div>
          <button onClick={() => navigate("/log-dive")} className="btn-primary text-sm px-4 py-2">
            <Plus className="w-4 h-4" /> Log Dive
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 border-r border-card-border overflow-y-auto custom-scrollbar">
          {isLoading && dives.length === 0 ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-3 animate-pulse">
                  <div className="h-3 bg-navy/50 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-navy/50 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : dives.length === 0 ? (
            <div className="text-center py-20 px-6">
              <FileText className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No dives yet</h3>
              <p className="text-sm text-text-secondary mb-6">Time to get wet. Log your first dive.</p>
              <button onClick={() => navigate("/log-dive")} className="btn-primary">Log Your First Dive</button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {[...dives].reverse().map((dive) => (
                <DiveListItem
                  key={dive.id.toString()}
                  dive={dive}
                  isSelected={selectedDiveId === dive.id}
                  onSelect={() => setSelectedDiveId(dive.id)}
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

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-box px-3 py-2 !rounded-lg">
      <div className="stat-label flex items-center gap-1 !text-[9px]">{icon} {label}</div>
      <p className="text-sm font-bold text-surf mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function DiveListItem({
  dive, isSelected, onSelect,
}: {
  dive: NormalizedDive;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isVoided = !!dive.voidInfo?.isVoided;
  const attCount = dive.attestations.length;
  const dU = depthUnit(Number(dive.units) as UnitSystem);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left glass-card p-3 transition-all cursor-pointer ${
        isSelected ? "border-surf/40 bg-navy/20 shadow-md shadow-surf/5" : "hover:border-card-border-bright"
      } ${isVoided ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-sm font-semibold text-white">Dive #{dive.id.toString()}</p>
          <p className="text-[11px] text-text-tertiary flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />{" "}
            {new Date(Number(dive.diveDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {attCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-kelp bg-kelp/10 px-1.5 py-0.5 rounded-full border border-kelp/20">
              <ShieldCheck className="w-3 h-3" /> {attCount}
            </span>
          )}
          {Number(dive.decomp.totalDecompTimeMinutes) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full border border-gold/20">
              <Activity className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <FlagChip mode={Number(dive.data.mode)} purpose={Number(dive.data.purpose)} />
        <span className="text-white font-medium tabular-nums flex items-center gap-0.5">
          <Waves className="w-3 h-3 text-text-tertiary" />{Number(dive.data.maxDepth)}{dU}
        </span>
        <span className="text-text-tertiary tabular-nums">{Number(dive.data.bottomTimeMinutes)}min</span>
      </div>
      {Boolean(dive.env.location) && (
        <p className="text-[11px] text-text-tertiary mt-1.5 truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {dive.env.location}</p>
      )}
      {isVoided && <span className="pill pill-danger text-[9px] py-0 mt-1.5">corrected</span>}
    </button>
  );
}
