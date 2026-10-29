import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import { buildAttestationRequestParams } from "../lib/attestations";
import QRCode from "../components/QRCode";
import DiveForm from "../components/DiveForm";
import {
  emptyDiveFormState,
  diveFormToInput,
  startDayMismatch,
  type DiveFormState,
} from "../lib/diveForm";
import { useAccount } from "wagmi";
import { BookOpen, CheckCircle, Loader2 } from "lucide-react";

export default function LogDive() {
  const navigate = useNavigate();
  const { chain } = useAccount();
  const { hasContract, contractAddress } = useDiveContract();
  const { logDive, diveCount, isPending, isConfirming, isSuccess, error, reset } = useDiveLog(contractAddress);

  const [form, setForm] = useState<DiveFormState>(emptyDiveFormState());
  const dayMismatch = startDayMismatch(form);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContract || !form.diveDate || dayMismatch) return;
    logDive(diveFormToInput(form));
  };

  const resetForm = () => {
    setForm(emptyDiveFormState());
    reset();
  };

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <p className="text-text-secondary mb-6">No dive log bound to this wallet yet.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Deploy Your Logbook</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-rise">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Log a dive</h1>
        <p className="text-sm text-text-tertiary mt-1">Recorded permanently on-chain. Append-only.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <DiveForm value={form} onChange={setForm} />

        <button type="submit" disabled={isPending || isConfirming || dayMismatch} className="btn-primary w-full text-base">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
            : isConfirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging on-chain…</>
            : "Log dive permanently"}
        </button>

        {error && <p className="text-sm text-danger text-center">{error.message}</p>}
        {isSuccess && (
          <div className="glass-card hairline p-6 mt-5 text-center animate-slide-up">
            <CheckCircle className="w-9 h-9 text-kelp mx-auto mb-2" />
            <p className="text-kelp font-semibold">Dive logged permanently.</p>
            {diveCount !== undefined && (
              <p className="text-xs text-text-tertiary mt-1">Entry #{diveCount.toString()} in your sovereign logbook.</p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-4">
              {contractAddress && diveCount !== undefined && (
                <div>
                  <QRCode
                    value={`${window.location.origin}/attest?${buildAttestationRequestParams({
                      chainId: chain?.id ?? 43114,
                      contractAddress,
                      diveId: diveCount,
                    }).toString()}`}
                    size={120}
                  />
                  <p className="text-[10px] text-text-tertiary mt-1.5 max-w-[130px]">
                    Buddy scans to sign — free for them
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => navigate("/logbook")} className="btn-primary text-sm">
                  View in logbook
                </button>
                <button type="button" onClick={resetForm} className="btn-ghost text-sm">
                  Log another
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
