import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import { SOVEREIGN_DIVE_LOG_ABI, IDIVELOG_INTERFACE_ID } from "../lib/contracts";
import { DIVE_LOG_FACTORY_ABI, factoryAddress } from "../lib/factory";
import { DiverDownFlag, AlphaFlag } from "../components/flags/Flags";
import {
  Wallet, KeyRound, ShieldCheck, ExternalLink, Copy, Check, AlertTriangle,
  FileCode2, UserRound, Link2, Loader2, Trash2,
} from "lucide-react";

const EXPLORERS: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};

export default function Profile() {
  const navigate = useNavigate();
  const { isConnected, address, chainId, chain } = useAccount();
  const {
    hasContract, contractAddress, factoryConfigured, needsAdoption, refresh,
  } = useDiveContract();
  const { owner, diveCount, isOwner } = useDiveLog(contractAddress);
  const factory = factoryAddress(chainId);

  const [copied, setCopied] = useState<string>("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) refresh();
  }, [isSuccess, refresh]);

  const { data: isCompliant } = useReadContract({
    address: contractAddress,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "supportsInterface",
    args: [IDIVELOG_INTERFACE_ID],
    query: { enabled: !!contractAddress },
  });

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Connect your wallet to view your profile.</p>
      </div>
    );
  }

  const explorer = chain ? EXPLORERS[chain.id] ?? "" : "";
  const copy = (val: string, key: string) => {
    navigator.clipboard?.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(""), 1200);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-rise">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Diver Profile</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Your wallet <span className="text-text-secondary">is</span> your identity. No name, no profile —
          ERC-8260 stores zero PII on-chain.
        </p>
      </div>

      {/* Identity */}
      <div className="glass-card hairline p-5 space-y-3">
        <div className="section-title"><Wallet className="w-4 h-4" /> Your Identity</div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-bubble bg-abyss-deep/60 rounded-lg px-3 py-2.5 break-all flex-1 border border-card-border">
            {address}
          </div>
          <button onClick={() => copy(address ?? "", "addr")} className="btn-ghost shrink-0">
            {copied === "addr" ? <Check className="w-4 h-4 text-kelp" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Logbook registration */}
      <div className="glass-card hairline p-5 space-y-3">
        <div className="section-title"><FileCode2 className="w-4 h-4" /> Logbook Registration</div>

        {hasContract ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono text-bubble bg-abyss-deep/60 rounded-lg px-3 py-2.5 break-all flex-1 border border-card-border">
                {contractAddress}
              </div>
              <button onClick={() => copy(contractAddress ?? "", "contract")} className="btn-ghost shrink-0">
                {copied === "contract" ? <Check className="w-4 h-4 text-kelp" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card-inner p-3">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Owner
                </p>
                <p className="text-sm text-white mt-1 font-mono">
                  {owner ? `${owner.slice(0, 6)}…${owner.slice(-4)}` : "…"}
                  {isOwner ? (
                    <span className="pill pill-kelp ml-2 text-[9px] py-0">you</span>
                  ) : (
                    <span className="pill pill-warn ml-2 text-[9px] py-0">not owner</span>
                  )}
                </p>
              </div>
              <div className="glass-card-inner p-3">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Total Dives</p>
                <p className="text-lg font-bold text-surf mt-0.5 tabular-nums">{diveCount?.toString() ?? "…"}</p>
              </div>
            </div>

            {isCompliant !== undefined && (
              <div className={`glass-card-inner p-3 flex items-center gap-2 ${isCompliant ? "border-kelp/20" : "border-danger/20"}`}>
                {isCompliant ? (
                  <><ShieldCheck className="w-4 h-4 text-kelp" /><p className="text-xs text-kelp">ERC-8260 compliant (IDiveLog 0x321ef561)</p></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-danger" /><p className="text-xs text-danger">Contract does not implement IDiveLog — it may be a legacy/non-standard logbook.</p></>
                )}
              </div>
            )}

            <div className={`glass-card-inner p-3 flex items-center gap-2 ${factoryConfigured ? "border-surf/20" : "border-warn/20"}`}>
              <Link2 className={`w-4 h-4 ${factoryConfigured ? "text-surf" : "text-warn"}`} />
              <p className="text-xs text-text-secondary">
                {factoryConfigured
                  ? "Registered on-chain with the DiveLogFactory, any device finds this logbook automatically."
                  : "Bound locally (no factory deployed on this chain yet)."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => navigate(`/diver/${address}`)}
                className="btn-outline text-xs"
              >
                <UserRound className="w-3.5 h-3.5" /> View public profile
              </button>
              {explorer && (
                <a href={`${explorer}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Explorer
                </a>
              )}
              {factoryConfigured && isOwner && (
                <button
                  onClick={() => {
                    if (!factory) return;
                    writeContract({
                      address: factory,
                      abi: DIVE_LOG_FACTORY_ABI,
                      functionName: "releaseLogbook",
                    });
                  }}
                  disabled={isPending || isConfirming}
                  className="btn-ghost text-xs ml-auto !text-danger/80 hover:!text-danger"
                >
                  {isPending || isConfirming ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Releasing…</>
                  ) : (
                    <><Trash2 className="w-3.5 h-3.5" /> Release registration</>
                  )}
                </button>
              )}
            </div>
            {error && <p className="text-xs text-danger">{error.message}</p>}
            {isSuccess && (
              <p className="text-xs text-kelp flex items-center gap-1" role="status">
                <Check className="w-3.5 h-3.5" /> Released
              </p>
            )}
          </div>
        ) : needsAdoption && factoryConfigured ? (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary mb-1">Found an existing logbook on this device</p>
            <p className="text-xs font-mono text-bubble break-all mb-3">{needsAdoption}</p>
            <button onClick={() => navigate("/deploy")} className="btn-primary text-sm">
              Register it on-chain
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-text-secondary mb-3">No logbook registered for this wallet.</p>
            <button onClick={() => navigate("/deploy")} className="btn-primary text-sm">Claim one now</button>
          </div>
        )}
      </div>

      {/* Flag legend */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="flex gap-1.5 shrink-0">
          <DiverDownFlag className="w-8 h-auto rounded-sm" />
          <AlphaFlag className="w-8 h-auto" />
        </div>
        <p className="text-xs text-text-tertiary leading-relaxed">
          Your public profile splits bottom time under the two flags, recreational (Diver Down) and
          commercial / surface-supplied (Alpha). So dive shops and employers see the career they care about.
        </p>
      </div>

      <p className="text-[11px] text-text-tertiary text-center pt-2">
        Sovereign model: your records live in your contract, not in this app. Any ERC-8260 client can read them.
      </p>
    </div>
  );
}
