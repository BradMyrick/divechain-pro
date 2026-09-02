import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useDeployContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  DIVE_LOG_FACTORY_ABI,
  factoryAddress,
} from "../lib/factory";
import { SOVEREIGN_DIVE_LOG_ABI, SOVEREIGN_DIVE_LOG_BYTECODE } from "../lib/contracts";
import { DiverDownFlag, AlphaFlag } from "../components/flags/Flags";
import {
  ShieldCheck, KeyRound, Fingerprint, Loader2,
  AlertTriangle, ExternalLink, Check, ChevronRight, Anchor, Link2,
} from "lucide-react";

const BUY_AVAX_OPTIONS = [
  { name: "Core Wallet", desc: "Native Avalanche wallet with built-in on-ramp", url: "https://core.app" },
  { name: "Coinbase", desc: "Buy AVAX with card or bank transfer", url: "https://coinbase.com/price/avalanche-2" },
  { name: "Binance", desc: "Global exchange with AVAX/USDT pairs", url: "https://binance.com" },
];

export default function Deploy() {
  const { address, chainId } = useAccount();
  const navigate = useNavigate();
  const {
    hasContract, contractAddress, factoryConfigured, needsAdoption, dismissAdoption, refresh,
  } = useDiveContract();
  const { data: balance } = useBalance({ address });
  const factory = factoryAddress(chainId);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Legacy path only (chains without a deployed factory)
  const {
    deployContract, data: legacyTxHash, isPending: legacyPending,
  } = useDeployContract();
  const { data: legacyReceipt } = useWaitForTransactionReceipt({ hash: legacyTxHash });

  const [showAvaxHelp, setShowAvaxHelp] = useState(false);

  // Derived, not state: any path that lands a registration counts as claimed.
  const claimed = isSuccess || !!legacyReceipt?.contractAddress;
  const busy = isPending || isConfirming || legacyPending || claimed;

  // Once registered: refresh the factory lookup and enter the logbook.
  useEffect(() => {
    if (claimed) {
      refresh();
      const t = setTimeout(() => navigate("/logbook", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [claimed, refresh, navigate]);

  const hasEnoughAvax = balance && balance.value > 0n;

  if (hasContract) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="glass-card hairline p-8 animate-rise">
          <div className="flex justify-center gap-1.5 mb-4">
            <DiverDownFlag className="w-10 h-auto rounded-sm" />
            <AlphaFlag className="w-10 h-auto" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You already own a dive log</h2>
          <p className="text-sm text-text-secondary mb-6 break-all font-mono text-xs">
            {contractAddress}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/logbook")} className="btn-primary">
              Open My Logbook
            </button>
            <button onClick={() => navigate("/log-dive")} className="btn-outline">
              Log a Dive
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-rise">
      <div className="mb-8 text-center">
        <div className="flex justify-center gap-2 mb-4">
          <DiverDownFlag className="w-12 h-auto rounded-sm shadow-lg shadow-flag-red/20" />
          <AlphaFlag className="w-12 h-auto shadow-lg shadow-alpha-blue/20" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Claim your logbook</h1>
        <p className="text-sm sm:text-base text-text-secondary max-w-md mx-auto">
          One transaction creates your personal <span className="text-surf font-medium">SovereignDiveLog</span> on
          Avalanche and registers it on-chain — every device, browser and wallet finds it from now on.
          Your wallet is the only key.
        </p>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: KeyRound, title: "You are the owner", body: "Your wallet is the sole writer. No admin, no multisig, no upgrade path." },
          { icon: Fingerprint, title: "Zero on-chain PII", body: "No name, age, or biometrics. Your wallet address is your identity." },
          { icon: ShieldCheck, title: "Append-only forever", body: "Records can't be edited or deleted — only voided with an audit trail." },
        ].map((f) => (
          <div key={f.title} className="glass-card-inner p-4">
            <f.icon className="w-5 h-5 text-surf mb-2" />
            <p className="text-sm font-semibold text-white">{f.title}</p>
            <p className="text-[11px] text-text-tertiary mt-1 leading-snug">{f.body}</p>
          </div>
        ))}
      </div>

      {/* One-click migration for pre-factory logbooks */}
      {factoryConfigured && needsAdoption && !busy && (
        <div className="glass-card hairline p-5 mb-4 border-surf/25 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-surf/10 border border-surf/25 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-surf" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-1">Found your existing logbook</p>
              <p className="text-xs text-text-secondary mb-1">
                You deployed this before the on-chain registry existed. Register it once (one cheap
                transaction) and every device will find it automatically.
              </p>
              <p className="text-xs font-mono text-bubble break-all mb-3">{needsAdoption}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (!factory) return;
                    writeContract({
                      address: factory,
                      abi: DIVE_LOG_FACTORY_ABI,
                      functionName: "adoptLogbook",
                      args: [needsAdoption],
                    });
                  }}
                  className="btn-primary text-sm px-4 py-2.5"
                >
                  Register this logbook
                </button>
                <button onClick={dismissAdoption} className="btn-ghost text-sm">
                  Not mine — claim a new one
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AVAX balance check */}
      {!hasEnoughAvax && balance && !busy && (
        <div className="glass-card-inner p-4 border-warn/20 mb-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">You need a small amount of AVAX</p>
              <p className="text-xs text-text-secondary mb-3">
                Your balance: <span className="text-warn font-mono">{Number(balance.formatted).toFixed(4)} AVAX</span>.
                Claiming costs ~$0.10–0.50 (about 0.01–0.05 AVAX).
              </p>
              {!showAvaxHelp ? (
                <button
                  onClick={() => setShowAvaxHelp(true)}
                  className="text-xs text-surf flex items-center gap-1 hover:underline"
                >
                  Where to get AVAX <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <div className="space-y-1.5">
                  {BUY_AVAX_OPTIONS.map((opt) => (
                    <a
                      key={opt.name}
                      href={opt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-navy/30 border border-card-border hover:border-surf/30 transition-colors text-xs no-underline"
                    >
                      <div>
                        <span className="text-white font-medium">{opt.name}</span>
                        <span className="text-text-tertiary ml-2">{opt.desc}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-text-tertiary shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim card */}
      <div className="glass-card hairline p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Owner (you)</p>
            <p className="text-sm font-mono text-bubble break-all">{address}</p>
          </div>
          {factoryConfigured ? (
            <span className="pill pill-kelp self-start shrink-0">via DiveLogFactory</span>
          ) : (
            <span className="pill pill-warn self-start shrink-0">direct deploy</span>
          )}
        </div>

        {factoryConfigured ? (
          <button
            onClick={() => {
              if (!factory) return;
              writeContract({
                address: factory,
                abi: DIVE_LOG_FACTORY_ABI,
                functionName: "createLogbook",
              });
            }}
            disabled={busy || !address}
            className="btn-primary w-full text-base"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
            ) : isConfirming ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Raising your flag on Avalanche…</>
            ) : claimed ? (
              <><Check className="w-4 h-4" /> Claimed — opening logbook…</>
            ) : (
              <><Anchor className="w-4 h-4" /> Claim my logbook</>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              if (!address) return;
              deployContract({
                abi: SOVEREIGN_DIVE_LOG_ABI,
                bytecode: SOVEREIGN_DIVE_LOG_BYTECODE,
                args: [address],
              });
            }}
            disabled={busy || !address}
            className="btn-primary w-full text-base"
          >
            {legacyPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Deploying…</>
            ) : (
              <><Anchor className="w-4 h-4" /> Deploy my dive log</>
            )}
          </button>
        )}

        {busy && (
          <p className="text-[11px] text-text-tertiary text-center mt-3">
            ~2M gas. You'll be taken to your logbook once confirmed.
          </p>
        )}
        {error && (
          <p className="text-sm text-danger text-center mt-3 break-words">{error.message}</p>
        )}
      </div>

      {hasEnoughAvax && !busy && (
        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-text-tertiary">
          <Check className="w-3.5 h-3.5 text-kelp" />
          Balance: {Number(balance!.formatted).toFixed(4)} AVAX — ready
        </div>
      )}
    </div>
  );
}
