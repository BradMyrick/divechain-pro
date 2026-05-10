import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDeployContract, useWaitForTransactionReceipt, useTransactionReceipt } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  SOVEREIGN_DIVE_LOG_ABI,
  SOVEREIGN_DIVE_LOG_BYTECODE,
  BiologicalSex,
  UnitSystem,
  BIOLOGICAL_SEX_LABELS,
  UNIT_SYSTEM_LABELS,
} from "../lib/contracts";

export default function Deploy() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { hasContract, setContract, contractAddress } = useDiveContract();

  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(180);
  const [weight, setWeight] = useState(80);
  const [sex, setSex] = useState<BiologicalSex>(BiologicalSex.Unspecified);
  const [units, setUnits] = useState<UnitSystem>(UnitSystem.Metric);

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
        <div className="section-title">Diver Information</div>

        <div>
          <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
              Height ({units === UnitSystem.Metric ? "cm" : "in"})
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
              Weight ({units === UnitSystem.Metric ? "kg" : "lbs"})
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Unit System</label>
            <select
              value={units}
              onChange={(e) => setUnits(Number(e.target.value) as UnitSystem)}
            >
              {Object.entries(UNIT_SYSTEM_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Biological Sex</label>
          <select
            value={sex}
            onChange={(e) => setSex(Number(e.target.value) as BiologicalSex)}
          >
            {Object.entries(BIOLOGICAL_SEX_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              if (!address) return;
              deployContract({
                abi: SOVEREIGN_DIVE_LOG_ABI,
                bytecode: SOVEREIGN_DIVE_LOG_BYTECODE,
                args: [address, name, age, height, weight, sex, units],
              });
            }}
            disabled={isPending || isConfirming || !name}
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
