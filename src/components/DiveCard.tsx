import { Link } from "react-router-dom";
import {
  DIVE_MODE_LABELS,
  DIVE_PURPOSE_LABELS,
  DiveMode,
  DivePurpose,
  UnitSystem,
  UNIT_SYSTEM_LABELS,
} from "../lib/contracts";
import { MapPinIcon } from "@heroicons/react/24/outline";

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
}: DiveCardProps) {
  return (
    <Link to={`/logbook/${id.toString()}`} className="block no-underline group">
      <div
        className={`glass-card p-4 transition-all group-hover:border-bismuth/40 group-hover:shadow-lg group-hover:shadow-teal/5 ${
          isVoided ? "border-danger/20 opacity-50" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Dive #{id.toString()}
            </h3>
            <p className="text-[11px] text-gray-500">{formatDate(diveDate)}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20 font-medium uppercase tracking-wider">
            {DIVE_MODE_LABELS[mode as DiveMode] ?? "Unknown"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="stat-box py-2">
            <p className="text-base font-bold text-surf">
              {formatDepth(maxDepth, units as UnitSystem)}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">depth</p>
          </div>
          <div className="stat-box py-2">
            <p className="text-base font-bold text-surf">
              {formatDuration(bottomTimeMinutes)}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">duration</p>
          </div>
          <div className="stat-box py-2">
            <p className="text-base font-bold text-surf">
              {attestationCount ?? 0}
            </p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">attested</p>
          </div>
        </div>

        {location && (
          <p className="text-[11px] text-gray-500 mt-2.5 truncate flex items-center gap-1">
            <MapPinIcon className="w-3 h-3" /> {location}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy/40 text-gray-400 border border-card-border">
            {DIVE_PURPOSE_LABELS[purpose as DivePurpose] ?? "Unknown"}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-navy/40 text-gray-400 border border-card-border">
            {UNIT_SYSTEM_LABELS[units as UnitSystem] ?? "Unknown"}
          </span>
          {isVoided && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 ml-auto">
              VOIDED
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
