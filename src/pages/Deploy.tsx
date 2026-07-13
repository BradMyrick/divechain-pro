import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAccount,
  useDeployContract,
  useWaitForTransactionReceipt,
  useTransactionReceipt,
} from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { SOVEREIGN_DIVE_LOG_ABI, SOVEREIGN_DIVE_LOG_BYTECODE } from "../lib/contracts";
import { ShieldCheck, KeyRound, Fingerprint, Anchor, Loader2 } from "lucide-react";

export default function Deploy() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { hasContract, setContract, contractAddress } = useDiveContract();

  const { deployContract, data: txHash, isPending, error } = useDeployContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: receipt } = useTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (receipt?.contractAddress) {
      setContract(receipt.contractAddress);
      navigate("/logbook", { replace: true });
    }
  }, [receipt, setContract, navigate]);

  if (hasContract) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="glass-card hairline p-8">
          <img
            src="/dc-icon.png"
            alt="Divechain"
            className="w-16 h-16 mx-auto mb-4 object-contain animate-float"
          />
          <h2 className="text-xl font-bold text-white mb-2">You already own a dive log</h2>
          <p className="text-sm text-text-secondary mb-6 break-all font-mono text-xs">
            {contractAddress}
          </p>
          <button onClick={() => navigate("/logbook", { replace: true })} className="btn-primary">
            Open My Logbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-rise">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 pill pill-teal mb-4">
          <Anchor className="w-3.5 h-3.5" /> ERC-8260 Sovereign Dive Log
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Claim your sovereign logbook</h1>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Deploys your personal <span className="text-surf font-medium">SovereignDiveLog</span> contract on
          Avalanche. One per wallet. You hold the only key that can write to it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: KeyRound, title: "You are the owner", body: "Your wallet becomes the sole writer. No admin, no multisig, no upgrade." },
          { icon: Fingerprint, title: "Zero on-chain PII", body: "ERC-8260 stores no name, age or biometrics. Your wallet address is your identity." },
          { icon: ShieldCheck, title: "Append-only forever", body: "Records can't be edited or deleted — only voided with a visible audit trail." },
        ].map((f) => (
          <div key={f.title} className="glass-card-inner p-4">
            <f.icon className="w-5 h-5 text-surf mb-2" />
            <p className="text-sm font-semibold text-white">{f.title}</p>
            <p className="text-[11px] text-text-tertiary mt-1 leading-snug">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="glass-card hairline p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-tertiary">Owner (you)</p>
            <p className="text-sm font-mono text-bubble break-all">{address}</p>
          </div>
          <span className="pill pill-kelp">constructor(address)</span>
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
          disabled={isPending || isConfirming || !address}
          className="btn-primary w-full text-base"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Deploying to Avalanche…</>
          ) : (
            <>Deploy My Dive Log</>
          )}
        </button>

        {(isPending || isConfirming) && (
          <p className="text-[11px] text-text-tertiary text-center mt-3">
            Deployment ~2M gas. You'll be redirected to your logbook once confirmed.
          </p>
        )}
        {error && <p className="text-sm text-danger text-center mt-3">{error.message}</p>}
        {isSuccess && !receipt?.contractAddress && (
          <p className="text-sm text-bubble text-center mt-3 animate-pulse">Confirming deployment…</p>
        )}
      </div>
    </div>
  );
}
