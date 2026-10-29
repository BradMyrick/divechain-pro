import { Megaphone, Anchor, ArrowRight, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import NotifyForm from "../components/NotifyForm";

export default function Community() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Connect with fellow divers. Forums are on the way.
          </p>
        </div>
      </div>

      <div className="depth-ruler mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button onClick={() => navigate("/demo")} className="stat-box glass-card-hi text-left group touch-manipulation">
          <p className="stat-label">New here?</p>
          <p className="text-sm text-white mt-1 font-medium group-hover:text-surf transition-colors">
            Explore a live logbook, no wallet needed
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Depths, gas profiles, corrected entries and buddy attestations, on a real ERC-8260 shape.
          </p>
        </button>
        <div className="stat-box text-left">
          <p className="stat-label">The two flags</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Diver Down marks recreational dives; Alpha marks commercial and surface-supplied work.
            Every logbook speaks both: <span className="text-surf">two flags, one logbook</span>.
          </p>
        </div>
      </div>

      <div className="glass-card p-5 sm:p-8 text-center mb-6">
        <Megaphone className="w-8 h-8 text-bismuth/50 mx-auto mb-3" />
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Coming Soon: On-Chain Community
        </h2>
        <p className="text-sm text-text-secondary max-w-lg mx-auto mb-4">
          Community forums are coming. Posts will be signed by your wallet and tied to your logbook,
          so every voice is a real diver.
        </p>
        <p className="text-xs text-text-tertiary max-w-md mx-auto mb-6">
          Get notified when watch sync and community features launch.
        </p>
        <NotifyForm source="community" />
        <p className="mt-5">
          <a
            href="https://x.com/dive_chain"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-surf hover:underline"
          >
            Join the conversation on X <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-ghost text-xs inline-flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5" /> Learn about DiveChain <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
