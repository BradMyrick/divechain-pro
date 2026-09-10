import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer } from "vaul";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useLogbookData } from "../hooks/useLogbook";
import { computeDiverStats, formatMinutes, type NormalizedDive } from "../lib/diverStats";
import { UnitSystem, depthUnit } from "../lib/contracts";
import DiveDetail from "./DiveDetail";
import { groupByMonth } from "../lib/groupDives";
import FlagChip from "../components/FlagChip";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  BookOpen, Clock, ShieldCheck, Plus, Waves, MapPin, Activity, ChevronRight,
} from "lucide-react";

export default function Logbook() {
  const navigate = useNavigate();
  const { hasContract, contractAddress } = useDiveContract();
  const { dives, isLoading } = useLogbookData(contractAddress);
  const [selectedDiveId, setSelectedDiveId] = useState<bigint | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const stats = useMemo(() => computeDiverStats(dives), [dives]);
  const groups = useMemo(() => groupByMonth(dives), [dives]);

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No logbook found</h2>
          <p className="text-sm text-text-secondary mb-6">Claim your sovereign logbook first.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Claim Logbook</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
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

      {isLoading && dives.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-3 animate-pulse">
              <div className="h-3 bg-navy/50 rounded w-1/3 mb-2" />
              <div className="h-3 bg-navy/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : dives.length === 0 ? (
        <div className="text-center py-20 px-6">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No dives yet</h3>
          <p className="text-sm text-text-secondary mb-6">Time to get wet. Log your first dive.</p>
          <button onClick={() => navigate("/log-dive")} className="btn-primary">Log Your First Dive</button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mb-6">
            <p className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm text-[11px] uppercase tracking-widest text-text-tertiary font-semibold px-1 py-2 mb-2">
              {group.label} <span className="text-text-tertiary/60">({group.dives.length})</span>
            </p>
            <div className="space-y-2">
              {group.dives.map((dive) => (
                <DiveListItem
                  key={dive.id.toString()}
                  dive={dive}
                  isSelected={selectedDiveId === dive.id}
                  onSelect={() => setSelectedDiveId(dive.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <Drawer.Root
        open={selectedDiveId !== null}
        onOpenChange={(open) => { if (!open) setSelectedDiveId(null); }}
        direction={isDesktop ? "right" : "bottom"}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content
            className={`fixed z-50 bg-card border-card-border outline-none ${
              isDesktop
                ? "right-0 top-0 bottom-0 w-[min(560px,92vw)] border-l rounded-l-2xl"
                : "left-0 right-0 bottom-0 max-h-[88dvh] border-t rounded-t-2xl"
            }`}
          >
            <Drawer.Title className="sr-only">Dive details</Drawer.Title>
            <div className={isDesktop ? "h-full overflow-y-auto custom-scrollbar p-6" : "max-h-[80dvh] overflow-y-auto custom-scrollbar p-4 pb-8"}>
              {!isDesktop && (
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-card-border-bright shrink-0" title="Drag to close" />
              )}
              {selectedDiveId !== null && <DiveDetail embedded diveId={selectedDiveId} />}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
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
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            Dive #{dive.id.toString()}
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
          </p>
          <p className="text-[11px] text-text-tertiary flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />{" "}
            {new Date(Number(dive.diveDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
