import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useDiveContract } from "../contexts/DiveContractContext";
import {
  AlertTriangle,
  Lock,
  Check,
  ShieldCheck,
  Zap,
  Globe,
  Wrench,
  Users,
  BookOpen,
} from "lucide-react";

export default function Home() {
  const { isConnected } = useAccount();
  const { hasContract, setContract } = useDiveContract();
  const navigate = useNavigate();
  const [showImport, setShowImport] = useState(false);
  const [importAddr, setImportAddr] = useState("");

  return (
    <div className="w-full max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] flex flex-col lg:flex-row text-left">
      <div className="hidden lg:flex w-[300px] xl:w-[380px] flex-col items-center justify-center p-8 border-r border-card-border bg-[#010a14]/50">
        <div className="relative mb-8 w-full flex justify-center">
          <img
            src="/DC-LOGO-SCUBA.png"
            alt="Divechain"
            className="w-56 h-56 object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.15)] relative z-10"
          />
          <div className="absolute inset-0 rounded-full border border-surf/10 animate-[sonar-pulse_4s_ease-out_infinite] scale-125" />
          <div className="absolute inset-0 rounded-full border border-surf/5 animate-[sonar-pulse_4s_ease-out_infinite_1s] scale-150" />
        </div>
        <h1 className="text-4xl font-bold tracking-widest text-white text-center">
          DIVECHAIN<span className="text-surf">.PRO</span>
        </h1>
      </div>

      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 gap-6 overflow-x-hidden">
        <div className="flex lg:hidden items-center justify-center gap-3 mb-4 mt-2">
          <img src="/DC-LOGO-SCUBA.png" alt="Divechain" className="w-12 h-12 object-contain" />
          <h1 className="text-2xl font-bold tracking-widest text-white">
            DIVECHAIN<span className="text-surf">.PRO</span>
          </h1>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="glass-card flex-1 p-6 sm:p-8 relative min-h-[340px] flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <h2 className="section-title relative z-10">Global Dive Network</h2>

            <div className="relative z-10 flex flex-col justify-center flex-1 max-w-2xl">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                Your sovereign, on-chain dive log.
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed mb-6 max-w-lg">
                Cryptographically verified diving history on the Avalanche network.
                Secure your certifications, track bottom time, and explore global dive activity through decentralized technology.
              </p>

              {!isConnected && (
                <div className="p-4 bg-deep border border-card-border rounded-lg inline-block w-fit">
                  <p className="text-sm text-gray-300 mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warn" /> Wallet disconnected
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Click <strong className="text-surf">Connect Wallet</strong> in the navigation bar to access your logs.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card w-full xl:w-[380px] flex flex-col h-[340px] overflow-hidden">
            <div className="p-4 border-b border-card-border flex justify-between items-center bg-deep/50">
              <h2 className="section-title mb-0">Protocol Features</h2>
              <span className="text-xs text-text-secondary">{">"}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
              <div className="p-3 bg-card rounded-md border border-card-border hover:border-surf/30 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/60 border border-bismuth/20 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">Sovereign Ownership</p>
                    <p className="text-[11px] text-text-secondary mt-1 leading-snug">Your dive data lives in a contract you own. No central authority can alter your records.</p>
                    <p className="tag-verified mt-2 flex items-center gap-1"><Check className="w-3 h-3" /> Verified Secure</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-card rounded-md border border-card-border hover:border-surf/30 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/60 border border-bismuth/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">Buddy Attestations</p>
                    <p className="text-[11px] text-text-secondary mt-1 leading-snug">EIP-712 cryptographic signatures from dive buddies verify your dives happened.</p>
                    <p className="tag-verified mt-2 flex items-center gap-1"><Check className="w-3 h-3" /> On-Chain Proof</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-card rounded-md border border-card-border hover:border-surf/30 transition-colors">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy/60 border border-bismuth/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-teal" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">Avalanche Network</p>
                    <p className="text-[11px] text-text-secondary mt-1 leading-snug">Sub-second finality, low fees, permanent storage. Your dives outlast any service.</p>
                    <p className="tag-verified mt-2 flex items-center gap-1"><Check className="w-3 h-3" /> Immutable</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
          <button onClick={() => navigate("/dive-sites")} className="stat-box text-left hover:border-surf/40 transition-colors group">
            <div className="stat-label">Verified Sites On-Chain</div>
            <div className="stat-value flex items-center gap-2 group-hover:text-surf transition-colors">
              <Globe className="w-5 h-5" /> Explore
            </div>
            <div className="tag-verified mt-2">+ Global Regions</div>
          </button>

          <button onClick={() => navigate("/tools")} className="stat-box text-left hover:border-surf/40 transition-colors group">
            <div className="stat-label">Active Dive Planners</div>
            <div className="stat-value flex items-center gap-2 group-hover:text-surf transition-colors">
              <Wrench className="w-5 h-5" /> Dive Tools
            </div>
            <div className="tag-verified mt-2">+ NDL & SAC Rates</div>
          </button>

          <button onClick={() => navigate("/community")} className="stat-box text-left hover:border-surf/40 transition-colors group">
            <div className="stat-label">Active Divers</div>
            <div className="stat-value flex items-center gap-2 group-hover:text-surf transition-colors">
              <Users className="w-5 h-5" /> Community
            </div>
            <div className="tag-verified mt-2">+ Network Socials</div>
          </button>

          <button onClick={() => navigate("/logbook")} className="stat-box text-left hover:border-surf/40 transition-colors group">
            <div className="stat-label">Personal Records</div>
            <div className="stat-value flex items-center gap-2 group-hover:text-surf transition-colors">
              <BookOpen className="w-5 h-5" /> My Logbook
            </div>
            <div className="tag-verified mt-2">+ Secure View</div>
          </button>
        </div>

        <div className="mt-8 mb-8 flex justify-center w-full">
          {isConnected && hasContract && (
            <button
              onClick={() => navigate("/log-dive")}
              className="btn-primary w-full max-w-xl py-5 text-lg shadow-[0_4px_30px_rgba(34,211,238,0.15)] hover:shadow-[0_4px_40px_rgba(34,211,238,0.3)] uppercase tracking-wide"
            >
              Log Your Next Dive On-Chain
            </button>
          )}

          {isConnected && !hasContract && (
            <div className="flex flex-col items-center gap-5 w-full max-w-xl">
              <button
                onClick={() => navigate("/deploy")}
                className="btn-primary w-full py-5 text-lg shadow-[0_4px_30px_rgba(34,211,238,0.15)] uppercase tracking-wide"
              >
                Create New Dive Log Contract
              </button>

              {!showImport ? (
                <button onClick={() => setShowImport(true)} className="text-surf hover:text-white text-sm font-medium transition-colors">
                  Or connect an existing log contract
                </button>
              ) : (
                <div className="glass-card-inner p-5 w-full border border-surf/30">
                  <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-semibold">
                    Connect Existing SovereignDiveLog
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importAddr}
                      onChange={(e) => setImportAddr(e.target.value)}
                      placeholder="Paste contract address (0x...)"
                      className="flex-1"
                    />
                    <button
                      onClick={() => {
                        if (importAddr.startsWith("0x") && importAddr.length === 42) {
                          setContract(importAddr);
                          navigate("/logbook");
                        }
                      }}
                      disabled={importAddr.length !== 42}
                      className="btn-primary px-6"
                    >
                      Sync
                    </button>
                  </div>
                  <button onClick={() => setShowImport(false)} className="text-xs text-text-tertiary mt-4 hover:text-gray-300 w-full text-center transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
