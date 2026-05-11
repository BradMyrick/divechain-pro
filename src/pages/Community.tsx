import { useState } from "react";
import {
  ThumbsUp,
  MessageCircle,
  Megaphone,
} from "lucide-react";

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
];

const TAG_COLORS: Record<string, string> = {
  Discussion: "bg-bismuth/20 text-bismuth border-bismuth/30",
  Conservation: "bg-kelp/20 text-kelp border-kelp/30",
  Technical: "bg-teal/20 text-teal border-teal/30",
  Photography: "bg-coral/20 text-coral border-coral/30",
  Training: "bg-gold/20 text-gold border-gold/30",
};

export default function Community() {
  const [activeTag, setActiveTag] = useState<string>("All");

  const filtered = activeTag === "All" ? MOCK_POSTS : MOCK_POSTS.filter((p) => p.tag === activeTag);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="text-xs text-text-tertiary mt-1">Connect with fellow divers, share experiences, ask questions.</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4 mb-6 flex-wrap">
        {["All", "Discussion", "Conservation", "Technical", "Photography", "Training"].map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              activeTag === tag
                ? "bg-teal/20 text-surf border-teal/30"
                : "bg-ocean/20 text-text-secondary border-card-border hover:text-gray-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((post) => (
          <div key={post.id} className="glass-card p-4 hover:border-bismuth/30 transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ocean/50 flex items-center justify-center text-xs font-bold text-bismuth shrink-0">
                {post.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
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

      <div className="glass-card p-6 mt-8 text-center">
        <Megaphone className="w-8 h-8 text-bismuth/50 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-2">Coming Soon: On-Chain Community</h3>
        <p className="text-xs text-text-tertiary max-w-md mx-auto">
          Community posts, dive buddy reviews, and dive site ratings will be anchored on-chain for permanent, verifiable records.
        </p>
      </div>
    </div>
  );
}
