import { Megaphone, Anchor, ArrowRight, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import NotifyForm from "../components/NotifyForm";
import { LINKS, live } from "../config/links";

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

      <div className="flex gap-2 mt-4 mb-6 flex-wrap">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all touch-manipulation min-h-[36px] ${activeTag === tag
              ? "bg-teal/20 text-surf border-teal/30"
              : "bg-ocean/20 text-text-secondary border-card-border hover:text-gray-200 active:bg-navy/30"
              }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((post) => (
          <div key={post.id} className="glass-card p-4 glass-card-hi cursor-pointer touch-manipulation">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ocean/50 flex items-center justify-center text-xs font-bold text-bismuth shrink-0">
                {post.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-white">{post.author}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_COLORS[post.tag] || "bg-navy/20 text-text-secondary border-card-border"}`}>
                    {post.tag}
                  </span>
                  <span className="text-[10px] text-text-tertiary ml-auto">{post.time}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">{post.title}</h3>
                <p className="text-xs text-text-tertiary line-clamp-2">{post.body}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-teal" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-bismuth" /> {post.replies}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Community preview banner */}
      <div className="glass-card p-5 sm:p-6 mt-8 text-center">
        <Megaphone className="w-8 h-8 text-bismuth/50 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-2">Coming Soon: A Community of Verified Divers</h3>
        <p className="text-xs text-text-tertiary max-w-md mx-auto mb-4">
          Forums, dive-site conditions reports, and buddy planning — where every voice is backed by a real
          on-chain logbook. Reputation you can verify, not just a username.
        </p>
        <p className="text-xs text-text-tertiary max-w-md mx-auto mb-6">
          Get notified when watch sync and community features launch.
        </p>
        <NotifyForm source="community" />
        {live(LINKS.x) && (
          <p className="mt-5">
            <a
              href={LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-surf hover:underline"
            >
              Join the conversation on X <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        )}
        <div className="mt-6">
          <Link to="/about" className="btn-ghost text-xs inline-flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5" /> Learn about DiveChain <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
