import { Link } from "react-router-dom";
import {
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  DiveMode,
  DivePurpose,
  UnitSystem,
  UNIT_SYSTEM_LABELS,
} from "../lib/contracts";
import { MapPin, ShieldCheck, Clock } from "lucide-react";

interface DiveCardProps {
  id: bigint;
  diveDate: bigint;
  maxDepth: number;
  bottomTimeMinutes: number;
  mode: number;
  purpose: number;
  units: number;
  location?: string;
  isVoided?: boolean;
  attestationCount?: number;
  isVerified?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

function formatDepth(depth: number, units: UnitSystem): string {
  return units === UnitSystem.Metric ? `${depth}m` : `${depth}ft`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(timestamp: bigint): string {
  const epochMs = Number(timestamp) * 1000;
  return new Date(epochMs).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DiveCard({
  id,
  diveDate,
  maxDepth,
  bottomTimeMinutes,
  mode,
  purpose,
  units,
  location,
  isVoided,
  attestationCount,
  isVerified,
  isSelected,
  onSelect,
}: DiveCardProps) {
  const content = (
    <div
      className={`glass-card p-4 transition-all ${
        isSelected
          ? "border-surf/40 bg-navy/20 shadow-md shadow-surf/5"
          : "group-hover:border-bismuth/40 group-hover:shadow-lg group-hover:shadow-teal/5"
      } ${isVoided ? "border-danger/20 opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Dive #{id.toString()}
          </h3>
          <p className="text-[11px] text-text-tertiary flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {formatDate(diveDate)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isVerified !== false ? (
            <span className="flex items-center gap-1 text-[10px] text-kelp bg-kelp/10 px-2 py-0.5 rounded-full border border-kelp/20">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-warn bg-warn/10 px-2 py-0.5 rounded-full border border-warn/20">
              <Clock className="w-3 h-3" /> Syncing
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="stat-box py-2">
          <p className="text-base font-bold text-surf">
            {formatDepth(maxDepth, units as UnitSystem)}
          </p>
          <p className="text-[9px] text-text-tertiary uppercase tracking-wider">depth</p>
        </div>
        <div className="stat-box py-2">
          <p className="text-base font-bold text-surf">
            {formatDuration(bottomTimeMinutes)}
          </p>
          <p className="text-[9px] text-text-tertiary uppercase tracking-wider">duration</p>
        </div>
        <div className="stat-box py-2">
          <p className="text-base font-bold text-surf">
            {attestationCount ?? 0}
          </p>
          <p className="text-[9px] text-text-tertiary uppercase tracking-wider">attested</p>
        </div>
      </div>

      {location && (
        <p className="text-[11px] text-text-tertiary mt-2.5 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {location}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy/40 text-text-tertiary border border-card-border">
          {DIVE_MODE_LABELS[mode as DiveMode] ?? "Unknown"}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy/40 text-text-tertiary border border-card-border">
          {DIVE_PURPOSE_LABELS[purpose as DivePurpose] ?? "Unknown"}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy/40 text-text-tertiary border border-card-border">
          {UNIT_SYSTEM_LABELS[units as UnitSystem] ?? "Unknown"}
        </span>
        {isVoided && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 ml-auto">
            VOIDED
          </span>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button onClick={onSelect} className="block w-full text-left no-underline group">
        {content}
      </button>
    );
  }

  return (
    <Link to={`/logbook/${id.toString()}`} className="block no-underline group">
      {content}
    </Link>
  );
}
