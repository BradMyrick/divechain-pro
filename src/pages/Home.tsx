import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  Anchor, KeyRound, ShieldCheck, Zap, Lock, FileStack, Fingerprint,
  Waves, BookOpen, ArrowRight, PenLine, Wallet, Fuel,
  Watch, BellRing, Check, ChevronRight, ExternalLink, Coffee, Globe,
  Users, Wrench,
} from "lucide-react";

const PROBLEMS = [
  {
    icon: Watch,
    title: "Trapped in proprietary software",
    body: "Your Shearwater, Garmin, or Suunto stores your dives in their format. When the app dies or you switch brands, your history stays behind.",
  },
  {
    icon: FileStack,
    title: "Paper logs get destroyed",
    body: "Water, fire, moves, or just time - physical logbooks are fragile. Decades of dive history can vanish in an instant.",
  },
  {
    icon: Lock,
    title: "No verifiable proof",
    body: "Anyone can write anything in a paper log or screenshot an app. Employers, instructors, and buddies can't verify your experience.",
  },
];

const STEPS = [
  {
    num: "1",
    icon: Wallet,
    title: "Get a wallet",
    body: "Download Core, MetaMask, or Rabby - it takes 30 seconds. This becomes your dive log's key.",
    action: null,
  },
  {
    num: "2",
    icon: Fuel,
    title: "Add a few cents of AVAX",
    body: "Deploying costs about $0.50. Buy AVAX on Coinbase, Binance, or directly in Core Wallet. You only need pocket change.",
    action: "buy",
  },
  {
    num: "3",
    icon: Anchor,
    title: "Claim your logbook",
    body: "One transaction deploys your personal SovereignDiveLog contract. Your wallet is the only key. No company can touch it.",
    action: "deploy",
  },
  {
    num: "4",
    icon: PenLine,
    title: "Log your first dive",
    body: "Fill in depth, time, gas, and environment details. Your buddy signs an EIP-712 attestation - cryptographically proving the dive happened.",
    action: "log",
  },
];

const PILLARS = [
  {
    icon: FileStack, tone: "surf" as const,
    title: "Permanent & immutable",
    body: "Once logged, a dive can never be altered or deleted. You can void mistakes, but the original stays - creating an honest, auditable record.",
  },
  {
    icon: ShieldCheck, tone: "kelp" as const,
    title: "Cryptographically verifiable",
    body: "Your buddy signs a typed message vouching the dive happened. It's bound to your logbook, chain, and dive number - replay-proof and independently verifiable.",
  },
  {
    icon: Fingerprint, tone: "teal" as const,
    title: "Zero personal data on-chain",
    body: "No name, birth date, certification number, or biometrics. Your wallet address is your identity. ERC-8260 is privacy-preserving by design.",
  },
  {
    icon: Globe, tone: "surf" as const,
    title: "Portable across apps",
    body: "Any software that speaks ERC-8260 can read your dives. Switch apps without losing data - your logbook lives on-chain, not in anyone's database.",
  },
  {
    icon: KeyRound, tone: "kelp" as const,
    title: "No admin, no gatekeeper",
    body: "No company holds a backdoor key. No subscription can revoke your access. You deploy it, you own it, permanently.",
  },
  {
    icon: Zap, tone: "teal" as const,
    title: "Avalanche sub-second finality",
    body: "Your dive is confirmed in under a second for fractions of a cent. The C-Chain's low fees and instant settlement make this practical for every dive.",
  },
];

const FAQS = [
  {
    q: "How much does it cost?",
    a: "Deploying your logbook costs ~2M gas - roughly $0.30–0.80 on Avalanche C-Chain. Each dive log costs a fraction of a cent. Total cost of ownership: pocket change.",
  },
  {
    q: "What if I lose my wallet?",
    a: "Your logbook is a contract on-chain - it survives independently. If you still have the seed phrase, restore your wallet. If you lost the seed phrase too, the data is still readable forever; you just can't add new entries from that wallet.",
  },
  {
    q: "Can dive shops or employers verify my dives?",
    a: "Yes - that's the point. They can independently verify every dive, every buddy attestation, and the complete audit trail using any ERC-8260 compatible tool. No login required.",
  },
  {
    q: "Is my dive data public?",
    a: "Your wallet address is visible on-chain, but no personal identifiers are stored. Zero PII. It's pseudonymous - like a Reddit username that only you control.",
  },
  {
    q: "What watches and dive computers are supported?",
    a: "Currently, you log manually. We're building automatic import from Shearwater, Garmin, Suunto, and any dive computer that exports - sign up below to know when it ships.",
  },
  {
    q: "Why Avalanche and not another chain?",
    a: "Avalanche offers sub-second finality, fees under a cent, and the C-Chain is EVM-compatible - meaning any Ethereum wallet works. It's fast enough that logging a dive between surface intervals is instant.",
  },
];

const BUY_AVAX_OPTIONS = [
  { name: "Core Wallet", desc: "Native Avalanche wallet with built-in buy", url: "https://core.app" },
  { name: "Coinbase", desc: "Buy AVAX with card or bank transfer", url: "https://coinbase.com/price/avalanche-2" },
  { name: "Binance", desc: "Global exchange with AVAX pairs", url: "https://binance.com" },
  { name: "Bridge from ETH", desc: "Use the official Avalanche Bridge", url: "https://core.app/bridge" },
];

export default function Home() {
  const { isConnected } = useAccount();
  const { hasContract, setContract } = useDiveContract();
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);
  const [importAddr, setImportAddr] = useState("");
  const [email, setEmail] = useState("");
  const [notifyDone, setNotifyDone] = useState(false);
  const [showAvaxHelp, setShowAvaxHelp] = useState(false);

  const handleNotify = () => {
    if (!email.includes("@")) return;
    try {
      const subs = JSON.parse(localStorage.getItem("dc_watchlist") || "[]");
      if (!subs.includes(email)) subs.push(email);
      localStorage.setItem("dc_watchlist", JSON.stringify(subs));
    } catch { /* localStorage unavailable */ }
    setNotifyDone(true);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* ===== HERO ===== */}
      <section className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-4 sm:py-6 lg:py-12">
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left animate-rise">
          <div className="inline-flex items-center gap-2 pill pill-teal mb-5">
            <Anchor className="w-3.5 h-3.5" /> ERC-8260 · Sovereign Dive Log
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.02] mb-5 tracking-tight">
            <span className="gradient-text">Your dive log.</span>
            <br />
            <span className="text-gradient-surf">Not theirs.</span>
          </h1>

          <p className="text-base sm:text-lg text-text-secondary max-w-lg leading-relaxed mb-2">
            Stop trusting dive watch companies with your career. Deploy your sovereign logbook on
            Avalanche - permanent, portable, and cryptographically verifiable.
          </p>
          <p className="text-sm text-text-tertiary max-w-lg mb-7">
            Paper logs rot. Apps shut down. Dive computers lock you in. Your dive history deserves better.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg">
            {!isConnected ? (
              <div className="glass-card-inner p-3 px-4 flex items-center gap-2 border-warn/20 w-full sm:w-auto justify-center">
                <img src="/dc-icon.png" alt="" className="w-5 h-5 opacity-60" />
                <p className="text-sm text-text-secondary">Connect your wallet to get started</p>
              </div>
            ) : hasContract ? (
              <>
                <button onClick={() => navigate("/log-dive")} className="btn-primary text-base w-full sm:w-auto">
                  <PenLine className="w-4 h-4" /> Log a dive
                </button>
                <button onClick={() => navigate("/logbook")} className="btn-outline text-base w-full sm:w-auto">
                  Open logbook <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/deploy")} className="btn-primary text-base w-full sm:w-auto">
                  <KeyRound className="w-4 h-4" /> Claim your logbook
                </button>
                <button onClick={() => setShowImport(true)} className="btn-outline text-base w-full sm:w-auto">
                  Bind existing contract
                </button>
              </>
            )}
          </div>

          {isConnected && !hasContract && showImport && (
            <div className="glass-card hairline p-5 mt-5 w-full max-w-lg">
              <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-semibold">
                Bind an existing SovereignDiveLog
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="btn-primary shrink-0"
                >
                  Bind
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sonar emblem */}
        <div className="hidden lg:flex items-center justify-center shrink-0">
          <div className="relative w-[280px] h-[280px] flex items-center justify-center">
            <div className="sonar-ring" />
            <div className="sonar-ring" style={{ animationDelay: "1.3s" }} />
            <div className="sonar-ring" style={{ animationDelay: "2.6s" }} />
            <div className="absolute inset-0 rounded-full border border-surf/10" />
            <div className="absolute inset-8 rounded-full border border-surf/5" />
            <div className="absolute inset-16 rounded-full border border-surf/5" />
            <img
              src="/DC-LOGO-SCUBA.png"
              alt="Divechain scuba diver logo"
              className="w-40 h-40 object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.3)] relative z-10 animate-float"
            />
          </div>
        </div>
      </section>

      {/* ===== THE PROBLEM ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="text-center mb-8">
          <p className="section-title justify-center mb-3"><Waves className="w-4 h-4" /> The problem with dive logs today</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-3">Your dive history shouldn't have an expiration date.</h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto">
            Diving is a lifelong pursuit. Your records - depth profiles, gas mixes, decompression history, buddy sign-offs - are safety-critical evidence of your experience. Yet we trust them to systems designed to sell us the next gadget.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROBLEMS.map((p, i) => (
            <div key={p.title} className={`glass-card p-5 sm:p-6 animate-slide-up animate-delay-${i + 1}`}>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-4 border border-card-border-bright/30 bg-navy/30">
                <p.icon className="w-5 h-5 text-surf" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS: 4 STEPS ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="text-center mb-8">
          <p className="section-title justify-center mb-3"><Anchor className="w-4 h-4" /> Start in 4 minutes</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-3">From zero to sovereign dive log.</h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto">
            No technical expertise required. If you can install a dive app, you can own your dive data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STEPS.map((step, i) => (
            <div key={step.num} className={`glass-card hairline p-4 sm:p-5 flex flex-col animate-slide-up animate-delay-${i + 1}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surf/10 border border-surf/20 flex items-center justify-center shrink-0">
                  <span className="text-surf font-display font-bold text-sm sm:text-base">{step.num}</span>
                </div>
                <step.icon className="w-5 h-5 text-text-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">{step.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed flex-1">{step.body}</p>

              {step.action === "buy" && !showAvaxHelp && (
                <button
                  onClick={() => setShowAvaxHelp(true)}
                  className="mt-3 text-xs text-surf flex items-center gap-1 hover:underline"
                >
                  Where to get AVAX <ChevronRight className="w-3 h-3" />
                </button>
              )}

              {step.action === "buy" && showAvaxHelp && (
                <div className="mt-3 space-y-1.5">
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
                      <ExternalLink className="w-3 h-3 text-text-tertiary" />
                    </a>
                  ))}
                  <p className="text-[11px] text-text-tertiary mt-1">
                    Only need ~$0.50 worth - about 0.05 AVAX
                  </p>
                </div>
              )}

              {step.action === "deploy" && (
                <button onClick={() => navigate("/deploy")} className="btn-primary mt-3 text-sm w-full py-2.5">
                  Deploy logbook <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step.action === "log" && (
                <button onClick={() => navigate("/log-dive")} className="btn-primary mt-3 text-sm w-full py-2.5">
                  Log first dive <PenLine className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== WHY ON-CHAIN ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="text-center mb-8">
          <p className="section-title justify-center mb-3"><ShieldCheck className="w-4 h-4" /> Why put dive data on a blockchain?</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-3">Because your dive career is worth more than a PDF export.</h2>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto">
            ERC-8260 is an open standard designed for dive logging. It gives you four things no proprietary system can: permanence, verifiability, portability, and true ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p, i) => (
            <div key={p.title} className={`glass-card hairline glass-card-hi p-5 sm:p-6 animate-slide-up animate-delay-${(i % 4) + 1}`}>
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-4 pill-${p.tone} !border-current/20`}>
                <p.icon className={`w-5 h-5 ${p.tone === "surf" ? "text-surf" : p.tone === "kelp" ? "text-kelp" : "text-teal"}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== THE SOVEREIGN MODEL ===== */}
      <section className="glass-card hairline p-5 sm:p-8 lg:p-10 mb-12 lg:mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center">
          <div className="animate-slide-up">
            <p className="section-title"><KeyRound className="w-4 h-4" /> The sovereign model</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">One contract. One diver. Forever.</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Each diver deploys their own <code className="text-bubble text-xs bg-navy/30 px-1.5 py-0.5 rounded">SovereignDiveLog</code> contract.
              There's no central registry, no company database, no subscription. Your contract address <em>is</em> your logbook.
              Any compliant app reads it via the standard <code className="text-bubble text-xs bg-navy/30 px-1.5 py-0.5 rounded">IDiveLog</code> interface.
            </p>
            <ul className="space-y-2">
              {[
                "Wallet key = sole write authority",
                "ERC-165 interface detection (0x321ef561)",
                "Military-grade schema (DD Form 2544 lineage)",
                "Dual unit system: Imperial & Metric",
                "Batch logging for multi-dive days",
                "Void mechanism preserves audit trail",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-kelp shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:flex flex-col items-center">
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-surf/30 to-transparent" />
          </div>

          <div className="animate-slide-up animate-delay-1">
            <p className="section-title"><ShieldCheck className="w-4 h-4" /> The proof layer</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Buddy sign-offs that can't be faked.</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              "Pencil-whipping" fake dive entries is endemic in the industry. ERC-8260's EIP-712 typed-data
              attestations make every buddy sign-off cryptographically provable, replay-protected, and permanently
              linked to your logbook.
            </p>
            <div className="glass-card-inner p-4">
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Attestation type hash</p>
              <code className="text-[11px] text-bubble break-all font-mono leading-relaxed">
                Attestation(uint256 diveId, address verifyingContract, uint256 nonce)
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMING SOON: WATCH AUTO-FILL ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="glass-card p-5 sm:p-8 lg:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-surf/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 pill pill-gold mb-5">
              <Watch className="w-3.5 h-3.5" /> Coming soon
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mb-3">
              Auto-fill your dive log straight from your dive computer.
            </h2>
            <p className="text-sm sm:text-base text-text-secondary max-w-xl mx-auto mb-2">
              We're building direct integration with Shearwater, Garmin, Suunto, and Open Source Dive Computer
              exports. Your dive profile, gas data, deco obligations, and environmental readings - automatically
              logged on-chain the moment you surface.
            </p>
            <p className="text-xs text-text-tertiary max-w-md mx-auto mb-6">
              No more manual transcription. No more "I'll log it later." Surface, sync, done.
            </p>

            {!notifyDone ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="!py-3 !text-sm"
                />
                <button onClick={handleNotify} className="btn-primary text-sm w-full sm:w-auto shrink-0">
                  <BellRing className="w-4 h-4" /> Notify me
                </button>
              </div>
            ) : (
              <div className="glass-card-inner p-4 max-w-sm mx-auto flex items-center gap-3">
                <Check className="w-5 h-5 text-kelp shrink-0" />
                <p className="text-sm text-text-secondary">You're on the list. We'll email you when watch sync launches.</p>
              </div>
            )}

            <p className="text-[11px] text-text-tertiary mt-3">
              No spam, just one email when it's ready.
            </p>
          </div>
        </div>
      </section>

      {/* ===== QUICK NAV STRIP ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Globe, label: "Dive Sites", to: "/dive-sites", sub: "Explore global regions" },
            { icon: Wrench, label: "Dive Tools", to: "/tools", sub: "NDL, MOD & SAC calcs" },
            { icon: Users, label: "Community", to: "/community", sub: "Connect with divers" },
            { icon: BookOpen, label: "My Logbook", to: "/logbook", sub: "View your dives" },
          ].map((s) => (
            <button key={s.label} onClick={() => navigate(s.to)} className="stat-box glass-card-hi text-left group touch-manipulation">
              <s.icon className="w-5 h-5 text-surf mb-2" />
              <p className="stat-label">{s.label}</p>
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 group-hover:text-surf transition-colors">
                {s.sub} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="mb-12 lg:mb-16">
        <div className="text-center mb-8">
          <p className="section-title justify-center mb-3"><Coffee className="w-4 h-4" /> Questions divers ask</p>
          <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold gradient-text mb-3">Blockchain? For diving?</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            It sounds technical, but it's actually simple. Here are the honest answers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className={`glass-card p-4 sm:p-5 animate-slide-up animate-delay-${(i % 3) + 1}`}>
              <h3 className="text-sm sm:text-base font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="glass-card-inner p-4 sm:p-5 mt-4 text-center">
          <p className="text-sm text-text-secondary">
            More questions?{" "}
            <a href="https://github.com/BradMyrick/divechain-pro" target="_blank" rel="noopener noreferrer" className="text-surf hover:underline font-medium">
              Check the docs on GitHub
            </a>
            {" "}or ask in our community.
          </p>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="text-center py-8 sm:py-10 mb-6">
        <div className="glass-card hairline p-6 sm:p-10 max-w-2xl mx-auto">
          <img
            src="/DC-LOGO-SCUBA.png"
            alt="Divechain"
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-float"
          />
          <h2 className="text-xl sm:text-3xl font-bold gradient-text mb-3">Take control of your dive history.</h2>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            Deploy takes one transaction. Logging takes 30 seconds. Your dive career lives on-chain forever - no subscription, no lock-in, no company that can take it away.
          </p>
          {isConnected && hasContract ? (
            <button onClick={() => navigate("/log-dive")} className="btn-primary text-base px-8 py-4">
              <PenLine className="w-4 h-4" /> Log your next dive
            </button>
          ) : (
            <button onClick={() => navigate("/deploy")} className="btn-primary text-base px-8 py-4">
              <Anchor className="w-4 h-4" /> Deploy your logbook now
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
