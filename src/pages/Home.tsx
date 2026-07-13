import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  AlertTriangle, Anchor, KeyRound, ShieldCheck, Zap, Lock, FileStack, Fingerprint,
  Waves, Globe, Wrench, Users, BookOpen, Check, ArrowRight, PenLine,
} from "lucide-react";

const PILLARS = [
  {
    icon: KeyRound, tone: "surf" as const,
    title: "Sovereign ownership",
    body: "Your dive data lives in a contract only your wallet can write to. No admin keys, no upgrade path, no company that can shut it down.",
  },
  {
    icon: ShieldCheck, tone: "kelp" as const,
    title: "EIP-712 buddy attestations",
    body: "Dive buddies sign a typed message vouching the dive happened. The signature is bound to this exact logbook, chain and dive — replay-proof.",
  },
  {
    icon: FileStack, tone: "teal" as const,
    title: "Append-only corrective ledger",
    body: "Records can never be edited or deleted. Errors are fixed by voiding — the original stays readable, the audit trail intact. Like professional accounting.",
  },
  {
    icon: Fingerprint, tone: "surf" as const,
    title: "Zero on-chain PII",
    body: "No name, age or biometrics on-chain. Your wallet address is your identity. ERC-8260 is privacy-preserving by design.",
  },
  {
    icon: Lock, tone: "kelp" as const,
    title: "No registry, no gatekeeper",
    body: "Any agency, operator or diver can deploy a compliant logbook without permission. ERC-165 lets any tool verify it on sight.",
  },
  {
    icon: Zap, tone: "teal" as const,
    title: "Avalanche finality",
    body: "Sub-second finality and low fees on the C-Chain. Your career outlives any single service, server or regime.",
  },
];

export default function Home() {
  const { isConnected } = useAccount();
  const { hasContract, setContract } = useDiveContract();
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);
  const [importAddr, setImportAddr] = useState("");

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      {/* ===== HERO ===== */}
      <section className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 py-6 lg:py-10">
        <div className="flex flex-col justify-center animate-rise">
          <div className="inline-flex items-center gap-2 pill pill-teal self-start mb-5">
            <Anchor className="w-3.5 h-3.5" /> ERC-8260 · Dive Log Standard
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-5">
            <span className="gradient-text">Your dive career,</span>
            <br />
            <span className="text-gradient-surf">cryptographically yours.</span>
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-xl leading-relaxed mb-7">
            A sovereign, on-chain logbook where every dive is permanent, every buddy sign-off is provable,
            and no company can ever lose your records. Built on the ERC-8260 standard, live on Avalanche.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!isConnected ? (
              <div className="glass-card-inner p-3 px-4 flex items-center gap-2 border-warn/20">
                <AlertTriangle className="w-4 h-4 text-warn" />
                <p className="text-xs text-text-secondary">Connect your wallet to begin.</p>
              </div>
            ) : hasContract ? (
              <>
                <button onClick={() => navigate("/log-dive")} className="btn-primary text-base">
                  <PenLine className="w-4 h-4" /> Log a dive
                </button>
                <button onClick={() => navigate("/logbook")} className="btn-outline text-base">
                  Open logbook <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/deploy")} className="btn-primary text-base">
                  <KeyRound className="w-4 h-4" /> Claim your logbook
                </button>
                <button onClick={() => setShowImport(true)} className="btn-outline text-base">
                  Bind existing contract
                </button>
              </>
            )}
          </div>

          {isConnected && !hasContract && showImport && (
            <div className="glass-card hairline p-5 mt-5 max-w-xl">
              <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-semibold">
                Bind an existing SovereignDiveLog
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importAddr}
                  onChange={(e) => setImportAddr(e.target.value)}
                  placeholder="0x… contract address"
                />
                <button
                  onClick={() => {
                    if (importAddr.startsWith("0x") && importAddr.length === 42) {
                      setContract(importAddr);
                      navigate("/logbook");
                    }
                  }}
                  disabled={importAddr.length !== 42}
                  className="btn-primary px-6 shrink-0"
                >
                  Bind
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sonar emblem */}
        <div className="hidden lg:flex items-center justify-center relative">
          <div className="relative w-[300px] h-[300px] flex items-center justify-center">
            <div className="sonar-ring" />
            <div className="sonar-ring" style={{ animationDelay: "1.3s" }} />
            <div className="sonar-ring" style={{ animationDelay: "2.6s" }} />
            <div className="absolute inset-0 rounded-full border border-surf/10" />
            <div className="absolute inset-8 rounded-full border border-surf/5" />
            <div className="absolute inset-16 rounded-full border border-surf/5" />
            <img
              src="/DC-LOGO-SCUBA.png"
              alt="Divechain"
              className="w-44 h-44 object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.25)] relative z-10 animate-float"
            />
          </div>
        </div>
      </section>

      {/* ===== PROTOCOL STATS STRIP ===== */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 mb-10">
        {[
          { icon: Globe, label: "Dive Sites", to: "/dive-sites", sub: "Global regions" },
          { icon: Wrench, label: "Dive Tools", to: "/tools", sub: "NDL & SAC rates" },
          { icon: Users, label: "Community", to: "/community", sub: "Network socials" },
          { icon: BookOpen, label: "My Logbook", to: "/logbook", sub: "Secure view" },
        ].map((s) => (
          <button key={s.label} onClick={() => navigate(s.to)} className="stat-box glass-card-hi text-left group">
            <s.icon className="w-5 h-5 text-surf mb-2" />
            <p className="stat-label">{s.label}</p>
            <p className="text-sm text-text-secondary mt-1 flex items-center gap-1 group-hover:text-surf transition-colors">
              {s.sub} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </button>
        ))}
      </section>

      {/* ===== WHY IT MATTERS ===== */}
      <section className="mb-10">
        <div className="text-center mb-8">
          <p className="section-title justify-center mb-3"><Waves className="w-4 h-4" /> Why on-chain</p>
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Paper logbooks die. This one can't.</h2>
          <p className="text-sm text-text-secondary max-w-2xl mx-auto">
            Dive logs are safety-critical records of decompression history and qualifications. They get lost,
            burned, or deleted when an app shuts down. ERC-8260 fixes the four ways logbooks fail today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="glass-card hairline glass-card-hi p-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border pill-${p.tone} !border-current/20`}>
                <p.icon className={`w-5 h-5 ${p.tone === "surf" ? "text-surf" : p.tone === "kelp" ? "text-kelp" : "text-teal"}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="glass-card hairline p-6 sm:p-10 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center">
          <div>
            <p className="section-title"><KeyRound className="w-4 h-4" /> The sovereign model</p>
            <h3 className="text-2xl font-bold text-white mb-3">One contract. One diver. Forever.</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Each diver deploys their own <code className="text-bubble text-xs">SovereignDiveLog</code>. There's no
              central registry — your contract address + chain ID <em>is</em> your logbook. Any compliant app
              reads it via the standard <code className="text-bubble text-xs">IDiveLog</code> interface.
            </p>
            <ul className="space-y-2">
              {["Wallet key = sole write authority", "ERC-165 interface detection (0x321ef561)", "Military-grade schema (DD Form 2544 lineage)", "Dual unit system: Imperial & Metric"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-kelp shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:flex flex-col items-center">
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-surf/30 to-transparent" />
          </div>

          <div>
            <p className="section-title"><ShieldCheck className="w-4 h-4" /> The proof layer</p>
            <h3 className="text-2xl font-bold text-white mb-3">Buddy sign-offs you can verify.</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              "Pencil-whipping" — faking dive entries — is endemic. ERC-8260's EIP-712 attestations make every
              sign-off cryptographically provable, replay-proof, and permanent.
            </p>
            <div className="glass-card-inner p-4">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Attestation type hash</p>
              <code className="text-[11px] text-bubble break-all font-mono">Attestation(uint256 diveId, address verifyingContract, uint256 nonce)</code>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="text-center py-10">
        <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Make your next dive permanent.</h2>
        <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
          Deploy in one transaction. Log dives forever. Carry your career in a contract address.
        </p>
        {isConnected && hasContract ? (
          <button onClick={() => navigate("/log-dive")} className="btn-primary text-base px-8 py-4">
            <PenLine className="w-4 h-4" /> Log your next dive
          </button>
        ) : (
          <button onClick={() => navigate("/deploy")} className="btn-primary text-base px-8 py-4">
            <KeyRound className="w-4 h-4" /> Deploy your logbook
          </button>
        )}
      </section>
    </div>
  );
}
