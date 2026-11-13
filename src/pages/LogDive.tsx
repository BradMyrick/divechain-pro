import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useDiveLog } from "../hooks/useDiveLog";
import { buildAttestationRequestParams } from "../lib/attestations";
import QRCode from "../components/QRCode";
import DiveForm from "../components/DiveForm";
import {
  emptyDiveFormState,
  diveFormToDraft,
  prepareDiveInput,
  startDayMismatch,
  type DiveFormState,
} from "../lib/diveForm";
import {
  getIpfsConfig,
  saveProfile,
  publishProfile,
  setIpfsConfig,
} from "../lib/profileVault";
import { useAccount } from "wagmi";
import { BookOpen, CheckCircle, Loader2, Globe, HardDrive, Settings2 } from "lucide-react";

export default function LogDive() {
  const navigate = useNavigate();
  const { chain } = useAccount();
  const { hasContract, contractAddress } = useDiveContract();
  const { logDive, diveCount, isPending, isConfirming, isSuccess, error, reset } = useDiveLog(contractAddress);

  const [form, setForm] = useState<DiveFormState>(emptyDiveFormState());
  const dayMismatch = startDayMismatch(form);
  const [publish, setPublish] = useState(false);
  const [showPinConfig, setShowPinConfig] = useState(false);
  const [pinJwt, setPinJwt] = useState("");
  const [prepError, setPrepError] = useState("");
  const [preparing, setPreparing] = useState(false);

  const canPublish = !!getIpfsConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasContract || !form.diveDate || dayMismatch || preparing) return;
    setPrepError("");
    setPreparing(true);
    try {
      const draft = diveFormToDraft(form);
      const prepared = await prepareDiveInput(draft);
      let input = prepared.input;
      if (publish) {
        const { uri } = await publishProfile(prepared.uddf, `divechain-${input.diveDate}.uddf.enc`);
        input = { ...input, profileURI: uri };
        saveProfile(input.contentHash, { uddf: prepared.uddf, draft, published: { uri, at: Date.now() } });
      } else {
        saveProfile(input.contentHash, { uddf: prepared.uddf, draft });
      }
      logDive(input);
    } catch (err) {
      setPrepError(err instanceof Error ? err.message : "Preparing the dive record failed");
    } finally {
      setPreparing(false);
    }
  };

  const savePinConfig = () => {
    if (!pinJwt.trim()) {
      setShowPinConfig(false);
      return;
    }
    setIpfsConfig({ jwt: pinJwt.trim() });
    setShowPinConfig(false);
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
        <p className="text-sm text-text-tertiary mt-1">
          Recorded permanently on-chain. Append-only. The full profile is committed by its SHA-256 content hash.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <DiveForm value={form} onChange={setForm} />

        {/* Profile storage */}
        <div className="glass-card hairline p-6 space-y-3">
          <div className="section-title"><HardDrive className="w-4 h-4" /> Profile storage</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            The thin header goes on-chain. The full profile (UDDF) is hashed into the record and kept in this
            browser by default - export it from your Logbook anytime.
          </p>
          <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              disabled={!canPublish}
              className="mt-0.5"
            />
            <span>
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Also publish the profile to IPFS, encrypted with my vault key.
              {!canPublish && " Configure a pinning account first."}
            </span>
          </label>
          {publish && (
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              Published bytes are encrypted ciphertext, but they are public and permanent: anyone can fetch
              them, only key holders can read them. The on-chain hash stays the source of truth.
            </p>
          )}
          <button type="button" onClick={() => setShowPinConfig((v) => !v)} className="btn-ghost text-xs">
            <Settings2 className="w-3.5 h-3.5" /> {canPublish ? "Pinning account" : "Configure pinning"}
          </button>
          {showPinConfig && (
            <div className="glass-card-inner p-3 space-y-2">
              <p className="text-[11px] text-text-tertiary">
                Paste your own pinning service API JWT (e.g. Pinata). It is stored only in this browser;
                profiles are pinned directly from your device - never through a Divechain server.
              </p>
              <input
                type="password"
                value={pinJwt}
                onChange={(e) => setPinJwt(e.target.value)}
                placeholder="eyJhbGciOi…"
                className="w-full font-mono text-xs"
              />
              <button type="button" onClick={savePinConfig} className="btn-outline text-xs">Save</button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || dayMismatch || preparing}
          className="btn-primary w-full text-base"
        >
          {preparing ? <><Loader2 className="w-4 h-4 animate-spin" /> Hashing profile…</>
            : isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
            : isConfirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Logging on-chain…</>
            : "Log dive permanently"}
        </button>

        {prepError && <p className="text-sm text-danger text-center">{prepError}</p>}
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
                    Buddy scans to sign - free for them
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
