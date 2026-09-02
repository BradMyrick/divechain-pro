import { DiverDownFlag, AlphaFlag } from "./flags/Flags";
import { isCommercialDive } from "../lib/diverStats";

interface FlagChipProps {
  mode: number;
  purpose: number;
  className?: string;
}

/** Semantic flag badge: Alpha for commercial/SSA dives, Diver Down for recreational. */
export default function FlagChip({ mode, purpose, className = "" }: FlagChipProps) {
  const commercial = isCommercialDive(mode, purpose);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border px-1.5 py-0.5 ${
        commercial
          ? "text-alpha-blue border-alpha-blue/30 bg-alpha-blue/10"
          : "text-flag-red border-flag-red/30 bg-flag-red/10"
      } ${className}`}
      title={commercial ? "Commercial / surface-supplied dive" : "Recreational dive"}
    >
      {commercial ? (
        <AlphaFlag className="w-3.5 h-auto" />
      ) : (
        <DiverDownFlag className="w-3 h-auto" />
      )}
      {commercial ? "Commercial" : "Rec"}
    </span>
  );
}
