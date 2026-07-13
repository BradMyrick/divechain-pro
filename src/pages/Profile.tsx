import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import { SOVEREIGN_DIVE_LOG_ABI, IDIVELOG_INTERFACE_ID } from "../lib/contracts";
import { Wallet, KeyRound, ShieldCheck, ExternalLink, Copy, Check, AlertTriangle, FileCode2 } from "lucide-react";

const EXPLORERS: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};

export default function Profile() {
  const navigate = useNavigate();
  const { isConnected, address, chain } = useAccount();
  const { hasContract, contractAddress, setContract, clearContract } = useDiveContract();
  const { owner, diveCount, isOwner } = useDiveLog(contractAddress);

  const [editAddress, setEditAddress] = useState("");
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [copied, setCopied] = useState<string>("");

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
        <p className="text-text-secondary">Connect your wallet to view your contract.</p>
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
        <h1 className="text-3xl font-bold gradient-text">Contract Manager</h1>
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

      {/* Contract */}
      <div className="glass-card hairline p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-title mb-0"><FileCode2 className="w-4 h-4" /> Logbook Contract</div>
          {!showAddressInput && (
            <button onClick={() => setShowAddressInput(true)} className="text-xs text-surf hover:text-foam transition-colors">
              Switch
            </button>
          )}
        </div>

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

            <div className="flex items-center gap-2 pt-1">
              {explorer && (
                <a href={`${explorer}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Explorer
                </a>
              )}
              <button onClick={clearContract} className="btn-ghost text-xs ml-auto">
                Disconnect logbook
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-text-secondary mb-3">No dive log contract bound to this wallet.</p>
            <button onClick={() => navigate("/deploy")} className="btn-primary text-sm">Deploy One Now</button>
          </div>
        )}

        {showAddressInput && (
          <div className="space-y-2 pt-2">
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="0x…  (an existing SovereignDiveLog address)"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editAddress.startsWith("0x") && editAddress.length === 42) {
                    setContract(editAddress);
                    setShowAddressInput(false);
                    setEditAddress("");
                  }
                }}
                disabled={editAddress.length !== 42}
                className="btn-primary text-sm"
              >
                Bind
              </button>
              <button onClick={() => setShowAddressInput(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-text-tertiary text-center pt-2">
        Sovereign model: any compliant IDiveLog contract on any chain can be bound above. Your records live
        in the contract, not in this app.
      </p>
    </div>
  );
}
