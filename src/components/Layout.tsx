import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useState, type ComponentType } from "react";
import {
  BookOpenIcon,
  PencilSquareIcon,
  UserIcon,
  GlobeAltIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

type IconComponent = ComponentType<{ className?: string }>;

type NavGroup = {
  label: string;
  items: { path: string; label: string; icon: IconComponent; needsContract: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "My Log",
    items: [
      { path: "/logbook", label: "Logbook", icon: BookOpenIcon, needsContract: true },
      { path: "/log-dive", label: "Log Dive", icon: PencilSquareIcon, needsContract: true },
      { path: "/profile", label: "Profile", icon: UserIcon, needsContract: false },
    ],
  },
  {
    label: "Explore",
    items: [
      { path: "/dive-sites", label: "Dive Sites", icon: GlobeAltIcon, needsContract: false },
      { path: "/tools", label: "Dive Tools", icon: WrenchScrewdriverIcon, needsContract: false },
      { path: "/community", label: "Community", icon: UserGroupIcon, needsContract: false },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function Layout() {
  const { isConnected } = useAccount();
  const { hasContract } = useDiveContract();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === "/logbook") return location.pathname === "/logbook" || location.pathname.startsWith("/logbook/");
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="bubble-bg" />

      <header className="border-b border-card-border-bright bg-glass backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <img
              src="/DC-LOGO-SCUBA.png"
              alt="Divechain"
              className="w-9 h-9 rounded-lg object-contain shadow-lg shadow-teal/20"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-surf via-foam to-bubble bg-clip-text text-transparent leading-tight">
                Divechain
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-bismuth/60 leading-none hidden sm:block">
                Sovereign Dive Log
              </span>
            </div>
          </Link>

          {isConnected && (
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label} className="flex items-center gap-1">
                  {gi > 0 && <div className="w-px h-5 bg-card-border mx-2" />}
                  {group.items.map((item) => {
                    const disabled = item.needsContract && !hasContract;
                    return (
                      <Link
                        key={item.path}
                        to={disabled ? "#" : item.path}
                        onClick={(e) => { if (disabled) e.preventDefault(); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-all ${
                          isActive(item.path)
                            ? "bg-steel/30 text-foam"
                            : disabled
                            ? "text-gray-700 cursor-not-allowed"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={() => setMobileMenu(!mobileMenu)}
                className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
            )}
            <ConnectButton />
          </div>
        </div>

        {mobileMenu && isConnected && (
          <div className="lg:hidden border-t border-card-border bg-deep/95 backdrop-blur-md px-4 py-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const disabled = item.needsContract && !hasContract;
                    return (
                      <Link
                        key={item.path}
                        to={disabled ? "#" : item.path}
                        onClick={(e) => {
                          if (disabled) e.preventDefault();
                          else setMobileMenu(false);
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg no-underline transition-all ${
                          isActive(item.path) ? "bg-steel/20 text-surf" : disabled ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px]">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 relative z-10">
        <Outlet />
      </main>

      <footer className="border-t border-card-border py-6 text-center text-xs text-gray-600 relative z-10">
        <p>Divechain {"\u00B7"} Sovereign On-Chain Dive Log {"\u00B7"} Built on Avalanche</p>
      </footer>

      {isConnected && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-deep/95 backdrop-blur-md border-t border-card-border-bright z-50">
          <div className="flex justify-around py-2">
            {ALL_ITEMS.slice(0, 5).map((item) => {
              const disabled = item.needsContract && !hasContract;
              return (
                <Link
                  key={item.path}
                  to={disabled ? "#" : item.path}
                  onClick={(e) => { if (disabled) e.preventDefault(); }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg no-underline transition-colors ${
                    isActive(item.path)
                      ? "text-surf"
                      : disabled
                      ? "text-gray-700"
                      : "text-gray-500"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
