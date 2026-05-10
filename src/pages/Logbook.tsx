import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import DiveCard from "../components/DiveCard";
import { BookOpenIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";

export default function Logbook() {
  const navigate = useNavigate();
  const { hasContract, contractAddress } = useDiveContract();
  const { diveCount, allDiveIds, isOwner, profile } = useDiveLog(contractAddress);

  const diverName = profile ? String((profile as Record<string, unknown>)?.name ?? "Diver") : "Diver";

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card p-8">
          <BookOpenIcon className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No dive log found</h2>
          <p className="text-sm text-gray-400 mb-6">Deploy your sovereign dive logbook to get started.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">
            Create Dive Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {diverName !== "Diver" ? diverName : "Diver"}'s Logbook
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">{contractAddress}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="stat-box px-4 py-2">
            <span className="text-lg font-bold text-surf">
              {diveCount !== undefined ? diveCount.toString() : "--"}
            </span>
            <span className="text-[10px] text-gray-500 ml-1.5 uppercase">dives</span>
          </div>
          {isOwner && (
            <button
              onClick={() => navigate("/log-dive")}
              className="btn-primary text-sm px-4 py-2"
            >
              + Log Dive
            </button>
          )}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-card-border-bright to-transparent my-6" />

      {!allDiveIds || allDiveIds.length === 0 ? (
        <div className="text-center py-20">
          <DocumentPlusIcon className="w-12 h-12 text-bismuth/50 mx-auto mb-4 animate-[sway_3s_ease-in-out_infinite]" />
          <h3 className="text-lg font-semibold text-white mb-2">No dives yet</h3>
          <p className="text-sm text-gray-400 mb-6">Time to get wet. Log your first dive.</p>
          {isOwner && (
            <button
              onClick={() => navigate("/log-dive")}
              className="btn-primary"
            >
              Log Your First Dive
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDiveIds.map((id) => (
            <DiveCardWrapper
              key={id.toString()}
              contractAddress={contractAddress!}
              diveId={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiveCardWrapper({
  contractAddress,
  diveId,
}: {
  contractAddress: `0x${string}`;
  diveId: bigint;
}) {
  const { useDive, useVoidInfo, useAttestations } = useDiveLog(contractAddress);
  const { data: dive } = useDive(diveId);
  const { data: voidInfo } = useVoidInfo(diveId);
  const { data: attestations } = useAttestations(diveId);

  if (!dive) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-navy/50 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-10 bg-navy/50 rounded" />
          <div className="h-10 bg-navy/50 rounded" />
          <div className="h-10 bg-navy/50 rounded" />
        </div>
      </div>
    );
  }

  const d = dive as Record<string, unknown>;
  const data = d.data as Record<string, unknown>;
  const env = d.env as Record<string, unknown>;

  return (
    <DiveCard
      id={diveId}
      diveDate={d.diveDate as bigint}
      maxDepth={Number(data?.maxDepth ?? 0)}
      bottomTimeMinutes={Number(data?.bottomTimeMinutes ?? 0)}
      mode={Number(data?.mode ?? 0)}
      purpose={Number(data?.purpose ?? 0)}
      units={Number(d.units ?? 0)}
      location={env?.location as string | undefined}
      isVoided={voidInfo ? (voidInfo as Record<string, unknown>).isVoided as boolean : false}
      attestationCount={attestations && Array.isArray(attestations) ? (attestations as unknown[]).length : 0}
    />
  );
}
