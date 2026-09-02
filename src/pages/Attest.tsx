import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  useAccount, useSignTypedData, useSwitchChain, useReadContract, useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import {
  buildAttestationTypedData, parseAttestationRequestParams,
  buildSignatureHandoffUrl, parseSignatureHandoff,
} from "../lib/attestations";
import QRCode from "../components/QRCode";
import {
  ShieldCheck, Loader2, ArrowLeft, ShieldAlert, KeyRound, PenLine, CheckCircle, Waves, Clock, QrCode, Copy, Check,
} from "lucide-react";

const CHAIN_NAMES: Record<number, string> = { 43113: "Avalanche Fuji", 43114: "Avalanche C-Chain" };

export default function Attest() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const req = parseAttestationRequestParams(params);
  const handoff = parseSignatureHandoff(params);

  const { data: dive } = useReadContract({
    address: req?.contractAddress,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "getDive",
    args: [req?.diveId ?? 0n],
    query: { enabled: !!req },
  });
  const { data: nonce } = useReadContract({
    address: req?.contractAddress,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "attesterNonce",
    args: [address],
    query: { enabled: !!req && !!address },
  });

  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();
  const { writeContract, data: txHash, isPending: isRelaying, error: relayError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [signature, setSignature] = useState<`0x${string}` | null>(null);
  const [signError, setSignError] = useState<string>("");
  const [showHandoffQr, setShowHandoffQr] = useState(false);
  const [handoffCopied, setHandoffCopied] = useState(false);

  const handoffUrl =
    !!req && signature && nonce !== undefined
      ? buildSignatureHandoffUrl(req, nonce as bigint, signature)
      : "";

  if (!req) {
    return (
      <Center>
        <ShieldAlert className="w-10 h-10 text-warn mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid attestation link</h1>
        <p className="text-sm text-text-secondary mb-6">This link is missing the chain, contract or dive parameters.</p>
        <Link to="/" className="btn-primary">Go home</Link>
      </Center>
    );
  }

  const onWrongChain = !!chain && chain.id !== req.chainId;
  const diveRec = dive as Record<string, unknown> | undefined;
  const diveData = diveRec?.data as Record<string, unknown> | undefined;
  const diveEnv = diveRec?.env as Record<string, unknown> | undefined;

  const handleSign = async () => {
    if (!address || nonce === undefined) return;
    setSignError("");
    try {
      const sig = await signTypedDataAsync(
        buildAttestationTypedData(req.chainId, req.contractAddress, req.diveId, nonce as bigint) as never,
      );
      setSignature(sig);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : "Signing failed");
    }
  };

  const handleRelay = (sig: `0x${string}`, n: bigint) => {
    if (!req) return;
    writeContract({
      address: req.contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "attestDive",
      args: [req.diveId, n, sig],
    });
  };

  return (
    <div className="max-w-2xl mx-auto animate-rise">
      <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-white text-sm flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 pill pill-kelp mb-3"><ShieldCheck className="w-3.5 h-3.5" /> EIP-712 Attestation</div>
        <h1 className="text-3xl font-bold gradient-text">Attest a dive</h1>
        <p className="text-sm text-text-tertiary mt-2 max-w-md mx-auto">
          You're vouching that this dive happened. Your signature is cryptographically bound to this exact
          logbook, chain and dive - it can't be replayed elsewhere.
        </p>
      </div>

      {/* Target dive preview */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><Waves className="w-4 h-4" /> Dive #{req.diveId.toString()}</div>
        {!diveRec ? (
          <div className="flex items-center gap-2 text-text-tertiary text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading dive…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Preview label="Location" value={String(diveEnv?.location ?? "-")} />
            <Preview label="Date" value={new Date(Number(diveRec.diveDate) * 1000).toLocaleDateString()} />
            <Preview label="Max Depth" value={`${diveData?.maxDepth ?? "-"}`} />
            <Preview label="Bottom Time" value={`${diveData?.bottomTimeMinutes ?? "-"} min`} />
          </div>
        )}
        <p className="text-[10px] text-text-tertiary mt-3 break-all font-mono">{req.contractAddress}</p>
      </div>

      {/* Signer card */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><KeyRound className="w-4 h-4" /> You (the attester)</div>
        {!address ? (
          <p className="text-sm text-text-secondary">Connect your wallet to sign this attestation.</p>
        ) : (
          <>
            <p className="text-xs font-mono text-bubble break-all mb-3">{address}</p>
            <Preview label="Your on-chain nonce" value={nonce !== undefined ? (nonce as bigint).toString() : "…"} />
          </>
        )}
      </div>

      {/* Wrong chain */}
      {onWrongChain && address && (
        <div className="glass-card-inner p-4 mb-4 border-warn/20 flex items-center justify-between gap-3">
          <p className="text-xs text-warn flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> Switch to {CHAIN_NAMES[req.chainId] ?? `chain ${req.chainId}`} to attest.</p>
          <button onClick={() => switchChain({ chainId: req.chainId })} className="btn-outline text-xs">Switch</button>
        </div>
      )}

      {/* Errors */}
      {signError && <p className="text-sm text-danger text-center mb-3">{signError}</p>}
      {relayError && <p className="text-sm text-danger text-center mb-3">{relayError.message}</p>}

      {/* Actions */}
      {handoff && !isSuccess ? (
        /* QR handoff relay mode: a buddy already signed,anyone records it. */
        <div className="glass-card hairline p-5 mb-4 border-kelp/20">
          <div className="section-title"><QrCode className="w-4 h-4" /> Signed attestation handed to you</div>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            A buddy has cryptographically signed this attestation. Recording it on-chain costs a
            fraction of a cent. Your wallet pays the gas, the diver gets the credit.
          </p>
          <div className="glass-card-inner p-3 mb-3 border-kelp/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-kelp shrink-0" />
            <p className="text-xs text-kelp truncate font-mono">
              sig {handoff.signature.slice(0, 12)}…{handoff.signature.slice(-8)} · nonce {handoff.nonce.toString()}
            </p>
          </div>
          <button
            onClick={() => handleRelay(handoff.signature, handoff.nonce)}
            disabled={isRelaying}
            className="btn-primary w-full text-base"
          >
            {isRelaying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirm…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Record attestation on-chain</>
            )}
          </button>
        </div>
      ) : !address ? null : isConfirming ? (
        <div className="glass-card-inner p-4 text-center border-kelp/20">
          <Loader2 className="w-5 h-5 text-kelp mx-auto mb-1 animate-spin" />
          <p className="text-sm text-kelp">Recording attestation on-chain…</p>
        </div>
      ) : isSuccess ? (
        <div className="glass-card-inner p-5 text-center border-kelp/30">
          <CheckCircle className="w-8 h-8 text-kelp mx-auto mb-2" />
          <p className="text-kelp font-semibold">Attestation recorded</p>
          <p className="text-xs text-text-tertiary mt-1">Your signature is now permanently part of this dive's proof.</p>
        </div>
      ) : !signature ? (
        <button onClick={handleSign} disabled={!address || nonce === undefined || onWrongChain || isSigning} className="btn-primary w-full text-base">
          {isSigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Sign in wallet…</> : <><PenLine className="w-4 h-4" /> Sign attestation (free)</>}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="glass-card-inner p-3 border-kelp/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-kelp shrink-0" />
            <p className="text-xs text-kelp truncate font-mono">Signed: {signature.slice(0, 10)}…{signature.slice(-8)}</p>
          </div>

          {!showHandoffQr ? (
            <>
              <button onClick={() => handleRelay(signature, (nonce as bigint) ?? 0n)} disabled={isRelaying} className="btn-primary w-full text-base">
                {isRelaying ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirm relay…</> : <><ShieldCheck className="w-4 h-4" /> Submit on-chain now</>}
              </button>
              <button onClick={() => setShowHandoffQr(true)} className="btn-outline w-full text-sm">
                <QrCode className="w-4 h-4" /> Let the diver record it instead
              </button>
            </>
          ) : (
            <div className="glass-card hairline p-5 text-center">
              <p className="text-xs font-semibold text-white mb-1">Let the diver scan this</p>
              <p className="text-[11px] text-text-tertiary mb-4">
                They record the attestation with their next transaction,you pay nothing.
              </p>
              {handoffUrl ? (
                <>
                  <div className="flex justify-center mb-3">
                    <QRCode value={handoffUrl} size={176} />
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(handoffUrl);
                      setHandoffCopied(true);
                      setTimeout(() => setHandoffCopied(false), 1500);
                    }}
                    className="btn-ghost text-xs"
                  >
                    {handoffCopied ? <><Check className="w-3 h-3 text-kelp" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
                  </button>
                </>
              ) : (
                <Loader2 className="w-5 h-5 text-text-tertiary animate-spin mx-auto" />
              )}
            </div>
          )}
          <p className="text-[11px] text-text-tertiary text-center">
            <Clock className="w-3 h-3 inline mr-1" />Signatures are replay-proof and can be relayed by anyone.
          </p>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="max-w-md mx-auto text-center py-20">{children}</div>;
}
function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-inner p-3">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5 truncate">{value}</p>
    </div>
  );
}
