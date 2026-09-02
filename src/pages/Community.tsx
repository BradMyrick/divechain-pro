import { useState } from "react";
import {
  ThumbsUp, MessageCircle, Megaphone, Anchor, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Post {
  id: number;
  author: string;
  initials: string;
  title: string;
  body: string;
  time: string;
  replies: number;
  likes: number;
  tag: string;
}

const MOCK_POSTS: Post[] = [
  {
    id: 1, author: "DeepDiver42", initials: "DD", time: "2h ago", replies: 8, likes: 24, tag: "Discussion",
    title: "Best dive computer under $500?",
    body: "Looking for recommendations for a reliable dive computer for recreational diving. Air integrated would be nice but not required.",
  },
  {
    id: 2, author: "CoralKeeper", initials: "CK", time: "5h ago", replies: 12, likes: 41, tag: "Conservation",
    title: "Coral bleaching report: Great Barrier Reef 2026",
    body: "Just returned from a monitoring expedition. Sharing observations and data from the northern sector.",
  },
  {
    id: 3, author: "TechDiveMike", initials: "TM", time: "1d ago", replies: 5, likes: 18, tag: "Technical",
    title: "Trimix diving at 80m: Planning considerations",
    body: "Lessons learned from a recent deep wreck expedition. Gas planning, decompression schedules, and bailout strategies.",
  },
  {
    id: 4, author: "UnderwaterPilot", initials: "UP", time: "1d ago", replies: 3, likes: 15, tag: "Photography",
    title: "Macro photography tips for muck diving",
    body: "How to get those perfect critter shots in silty conditions. Lens choices, lighting, and approach techniques.",
  },
  {
    id: 5, author: "NoviceDiver", initials: "ND", time: "3d ago", replies: 22, likes: 67, tag: "Training",
    title: "AOW vs Rescue Diver: Which first?",
    body: "I just got my Open Water cert. Should I do Advanced Open Water next or go straight to Rescue Diver?",
  },
  {
    id: 6, author: "DivechainHQ", initials: "DC", time: "6h ago", replies: 34, likes: 89, tag: "Announcement",
    title: "ERC-8260: A standard for sovereign dive logging",
    body: "Introducing the open standard for on-chain dive logs. Audit your history, verify certifications, and own your data forever.",
  },
];

const TAG_COLORS: Record<string, string> = {
  Discussion: "bg-bismuth/20 text-bismuth border-bismuth/30",
  Conservation: "bg-kelp/20 text-kelp border-kelp/30",
  Technical: "bg-teal/20 text-teal border-teal/30",
  Photography: "bg-coral/20 text-coral border-coral/30",
  Training: "bg-gold/20 text-gold border-gold/30",
  Announcement: "bg-surf/20 text-surf border-surf/30",
};

export default function Community() {
  const [activeTag, setActiveTag] = useState<string>("All");
  const navigate = useNavigate();

  const filtered = activeTag === "All" ? MOCK_POSTS : MOCK_POSTS.filter((p) => p.tag === activeTag);
  const tags = ["All", "Discussion", "Conservation", "Technical", "Photography", "Training", "Announcement"];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="text-sm text-text-tertiary mt-1">Connect with fellow divers, share experiences, and learn.</p>
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

      {/* On-Chain Community Banner */}
      <div className="glass-card p-5 sm:p-6 mt-8 text-center">
        <Megaphone className="w-8 h-8 text-bismuth/50 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-2">Coming Soon: On-Chain Community</h3>
        <p className="text-xs text-text-tertiary max-w-md mx-auto mb-4">
          Posts, buddy reviews, and dive site ratings anchored on-chain. Verifiable reputation, permanent discussions, zero censorship.
        </p>
        <button onClick={() => navigate("/")} className="btn-ghost text-xs">
          <Anchor className="w-3.5 h-3.5" /> Learn about Divechain <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
