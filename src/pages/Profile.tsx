import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import {
  BiologicalSex,
  UnitSystem,
  BIOLOGICAL_SEX_LABELS,
  UNIT_SYSTEM_LABELS,
} from "../lib/contracts";

export default function Profile() {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { hasContract, contractAddress, setContract } = useDiveContract();

  const {
    profile,
    owner,
    diveCount,
    isOwner,
    updateProfile,
    isPending,
    isConfirming,
  } = useDiveLog(contractAddress);

  const [editAddress, setEditAddress] = useState("");
  const [prevProfileRef, setPrevProfileRef] = useState(profile);
  const [name, setName] = useState("");
  const [age, setAge] = useState(0);
  const [height, setHeight] = useState(0);
  const [weight, setWeight] = useState(0);
  const [sex, setSex] = useState<BiologicalSex>(BiologicalSex.Unspecified);
  const [units, setUnits] = useState<UnitSystem>(UnitSystem.Metric);
  const [showAddressInput, setShowAddressInput] = useState(false);

  if (profile !== prevProfileRef) {
    setPrevProfileRef(profile);
    if (profile) {
      const p = profile as Record<string, unknown>;
      setName(p.name as string);
      setAge(Number(p.age));
      setHeight(Number(p.height));
      setWeight(Number(p.weight));
      setSex(Number(p.sex) as BiologicalSex);
      setUnits(Number(p.units) as UnitSystem);
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Connect your wallet to view profile.</p>
      </div>
    );
  }

  const handleSaveAddress = () => {
    if (editAddress.startsWith("0x") && editAddress.length === 42) {
      setContract(editAddress);
      setShowAddressInput(false);
    }
  };

  const handleUpdateProfile = () => {
    updateProfile(name, age, height, weight, sex, units);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Diver Profile</h1>
        <p className="text-xs text-gray-500 mt-1">Manage your identity and dive log contract.</p>
      </div>

      <div className="glass-card p-5 space-y-3">
        <div className="section-title">Wallet</div>
        <div className="text-xs font-mono text-gray-400 bg-abyss/40 rounded-lg px-3 py-2 break-all select-all">
          {address}
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-title mb-0 pb-0 border-0">Dive Log Contract</div>
          {!showAddressInput && (
            <button
              onClick={() => setShowAddressInput(true)}
              className="text-xs text-bismuth hover:text-surf transition-colors"
            >
              Change
            </button>
          )}
        </div>

        {hasContract ? (
          <div className="space-y-2">
            <div className="text-xs font-mono text-bismuth bg-abyss/40 rounded-lg px-3 py-2 break-all select-all">
              {contractAddress}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                Owner: {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "..."}
                {isOwner ? <span className="text-kelp ml-1">(you)</span> : <span className="text-warn ml-1">(not owner)</span>}
              </span>
              <span>Total dives: {diveCount?.toString() ?? "..."}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-3">No dive log contract configured.</p>
            <button onClick={() => navigate("/deploy")} className="btn-primary text-sm px-4 py-2">
              Deploy One Now
            </button>
          </div>
        )}

        {showAddressInput && (
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="0x..."
            />
            <button onClick={handleSaveAddress} className="btn-primary text-sm px-4 py-2 shrink-0">
              Save
            </button>
            <button onClick={() => setShowAddressInput(false)} className="text-xs text-gray-400 px-2">
              Cancel
            </button>
          </div>
        )}
      </div>

      {hasContract && Boolean(profile) && (
        <div className="glass-card p-5 space-y-4">
          <div className="section-title">Diver Information</div>

          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} disabled={!isOwner} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Height ({units === UnitSystem.Metric ? "cm" : "in"})
              </label>
              <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} disabled={!isOwner} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">
                Weight ({units === UnitSystem.Metric ? "kg" : "lbs"})
              </label>
              <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} disabled={!isOwner} />
            </div>
            <div>
              <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Sex</label>
              <select value={sex} onChange={(e) => setSex(Number(e.target.value) as BiologicalSex)} disabled={!isOwner}>
                {Object.entries(BIOLOGICAL_SEX_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-bismuth mb-1.5 font-medium uppercase tracking-wider">Units</label>
            <select value={units} onChange={(e) => setUnits(Number(e.target.value) as UnitSystem)} disabled={!isOwner}>
              {Object.entries(UNIT_SYSTEM_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {isOwner && (
            <button
              onClick={handleUpdateProfile}
              disabled={isPending || isConfirming}
              className="btn-primary w-full text-center"
            >
              {isPending ? "Confirm..." : isConfirming ? "Updating..." : "Update Profile"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
