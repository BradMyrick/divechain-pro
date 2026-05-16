import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDeployContract, useWaitForTransactionReceipt, useTransactionReceipt } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  SOVEREIGN_DIVE_LOG_ABI,
  SOVEREIGN_DIVE_LOG_BYTECODE,
} from "../lib/contracts";

export default function Deploy() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { hasContract, setContract, contractAddress } = useDiveContract();


  const { deployContract, data: txHash, isPending, error } = useDeployContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

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
        <div className="glass-card p-8">
          <img src="/dc-icon.png" alt="Divechain" className="w-16 h-16 mx-auto mb-4 object-contain drop-shadow-[0_0_16px_rgba(13,148,136,0.25)]" />
          <h2 className="text-xl font-bold text-white mb-2">You already have a dive log</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your logbook is deployed at <code className="text-bismuth text-xs">{contractAddress}</code>
          </p>
          <button
            onClick={() => navigate("/logbook", { replace: true })}
            className="btn-primary"
          >
            Open My Logbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create Your Dive Log</h1>
        <p className="text-sm text-gray-400">
          Deploy your personal, sovereign dive logbook on Avalanche. One per wallet.
        </p>
      </div>

      <div className="glass-card p-6 space-y-5">


        <div className="pt-2">
          <button
            onClick={() => {
              if (!address) return;
              deployContract({
                abi: SOVEREIGN_DIVE_LOG_ABI,
                bytecode: SOVEREIGN_DIVE_LOG_BYTECODE,
                args: [address],
              });
            }}
            disabled={isPending || isConfirming}
            className="btn-primary w-full text-center"
          >
            {isPending ? "Confirm in Wallet..." : isConfirming ? "Deploying to Avalanche..." : "Deploy My Dive Log"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-danger text-center">{error.message}</p>
        )}

        {isSuccess && !receipt?.contractAddress && (
          <div className="glass-card-inner p-4 text-center">
            <p className="text-sm text-bismuth animate-pulse">Confirming deployment...</p>
          </div>
        )}
      </div>
    </div>
  );
}
