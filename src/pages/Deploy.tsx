import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useDeployContract,
  useWaitForTransactionReceipt,
  useTransactionReceipt,
  useBalance,
} from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { SOVEREIGN_DIVE_LOG_ABI, SOVEREIGN_DIVE_LOG_BYTECODE } from "../lib/contracts";
import {
  ShieldCheck, KeyRound, Fingerprint, Anchor, Loader2,
  AlertTriangle, ExternalLink, Check, ChevronRight,
} from "lucide-react";

const BUY_AVAX_OPTIONS = [
  { name: "Core Wallet", desc: "Native Avalanche wallet with built-in on-ramp", url: "https://core.app" },
  { name: "Coinbase", desc: "Buy AVAX with card or bank transfer", url: "https://coinbase.com/price/avalanche-2" },
  { name: "Binance", desc: "Global exchange with AVAX/USDT pairs", url: "https://binance.com" },
];

export default function Deploy() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { hasContract, setContract, contractAddress } = useDiveContract();
  const { data: balance } = useBalance({ address });

  const { deployContract, data: txHash, isPending, error } = useDeployContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: receipt } = useTransactionReceipt({ hash: txHash });

  const [showAvaxHelp, setShowAvaxHelp] = useState(false);

  useEffect(() => {
    if (receipt?.contractAddress) {
      setContract(receipt.contractAddress);
      navigate("/logbook", { replace: true });
    }
  }, [receipt, setContract, navigate]);

  const hasEnoughAvax = balance && balance.value > 0n;
  const isDeploying = isPending || isConfirming;

  if (hasContract) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="glass-card hairline p-8 animate-rise">
          <img
            src="/dc-icon.png"
            alt="Divechain"
            className="w-16 h-16 mx-auto mb-4 object-contain animate-float"
          />
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
        <div className="inline-flex items-center gap-2 pill pill-teal mb-4">
          <Anchor className="w-3.5 h-3.5" /> ERC-8260 · Sovereign Dive Log
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Deploy your logbook</h1>
        <p className="text-sm sm:text-base text-text-secondary max-w-md mx-auto">
          One transaction creates your personal <span className="text-surf font-medium">SovereignDiveLog</span> on
          Avalanche. Your wallet becomes the only key that can write to it.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: KeyRound, title: "You are the owner", body: "Your wallet is the sole writer. No admin, no multisig, no upgrade path." },
          { icon: Fingerprint, title: "Zero on-chain PII", body: "No name, age, or biometrics. Your wallet address is your identity." },
          { icon: ShieldCheck, title: "Append-only forever", body: "Records can't be edited or deleted - only voided with an audit trail." },
        ].map((f) => (
          <div key={f.title} className="glass-card-inner p-4">
            <f.icon className="w-5 h-5 text-surf mb-2" />
            <p className="text-sm font-semibold text-white">{f.title}</p>
            <p className="text-[11px] text-text-tertiary mt-1 leading-snug">{f.body}</p>
          </div>
        ))}
      </div>

      {/* AVAX Balance Check */}
      {!hasEnoughAvax && balance && !isDeploying && (
        <div className="glass-card-inner p-4 border-warn/20 mb-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">You need a small amount of AVAX</p>
              <p className="text-xs text-text-secondary mb-3">
                Your balance: <span className="text-warn font-mono">{Number(balance.formatted).toFixed(4)} AVAX</span>.
                Deployment costs ~$0.30–0.80 (about 0.02–0.05 AVAX).
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
                  <p className="text-[11px] text-text-tertiary mt-1">
                    After buying, return here to deploy. Transactions confirm in under a second.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deployment Card */}
      <div className="glass-card hairline p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Owner (you)</p>
            <p className="text-sm font-mono text-bubble break-all">{address}</p>
          </div>
          <span className="pill pill-kelp self-start shrink-0">constructor(address)</span>
        </div>

        <button
          onClick={() => {
            if (!address) return;
            deployContract({
              abi: SOVEREIGN_DIVE_LOG_ABI,
              bytecode: SOVEREIGN_DIVE_LOG_BYTECODE,
              args: [address],
            });
          }}
          disabled={isDeploying || !address}
          className="btn-primary w-full text-base"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Deploying on Avalanche…</>
          ) : (
            <>Deploy My Dive Log</>
          )}
        </button>

        {isDeploying && (
          <p className="text-[11px] text-text-tertiary text-center mt-3">
            ~2M gas. You'll be redirected to your logbook once confirmed.
          </p>
        )}
        {error && (
          <p className="text-sm text-danger text-center mt-3 break-words">{error.message}</p>
        )}
        {isSuccess && !receipt?.contractAddress && (
          <p className="text-sm text-bubble text-center mt-3 animate-pulse">Waiting for confirmation…</p>
        )}
      </div>

      {/* Already have enough AVAX - show check */}
      {hasEnoughAvax && !isDeploying && (
        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-text-tertiary">
          <Check className="w-3.5 h-3.5 text-kelp" />
          Balance: {Number(balance!.formatted).toFixed(4)} AVAX - ready to deploy
        </div>
      )}

      {/* What happens next */}
      {!isDeploying && (
        <div className="glass-card-inner p-4 mt-4 animate-slide-up animate-delay-1">
          <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2 font-semibold">After deployment</p>
          <div className="space-y-2">
            {[
              "Your contract address appears in the sidebar",
              "You can immediately start logging dives",
              "Share your contract address with buddies so they can attest",
              "Your logbook is readable by any ERC-8260 compatible tool",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-surf font-mono text-xs shrink-0 mt-0.5">{i + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
