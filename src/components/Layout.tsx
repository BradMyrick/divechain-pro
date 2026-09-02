import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { useDiveContract } from "../contexts/DiveContractContext";
import WalletConnectWarning from "./WalletConnectWarning";
import { DivechainMark } from "./flags/Flags";
import { useState } from "react";
import {
  BookOpen,
  PenSquare,
  Globe,
  Wrench,
  Users,
  Menu,
  X,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  needsContract: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "My Log",
    items: [
      { path: "/logbook", label: "Logbook", icon: BookOpen, needsContract: true },
      { path: "/log-dive", label: "Log Dive", icon: PenSquare, needsContract: true },
      { path: "/profile", label: "Diver", icon: UserRound, needsContract: false },
    ],
  },
  {
    label: "Explore",
    items: [
      { path: "/dive-sites", label: "Dive Sites", icon: Globe, needsContract: false },
      { path: "/tools", label: "Dive Tools", icon: Wrench, needsContract: false },
      { path: "/community", label: "Community", icon: Users, needsContract: false },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function Sidebar({ hasContract, isActive }: { hasContract: boolean; isActive: (p: string) => boolean }) {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-card-border bg-card/50 backdrop-blur-sm relative z-20 h-screen sticky top-0">
      <div className="p-5 border-b border-card-border">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-11 h-11 rounded-lg bg-navy/60 border border-card-border flex items-center justify-center">
            <DivechainMark className="w-8 h-auto" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-[0.04em] text-white leading-none">
              DIVECHAIN
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary leading-none mt-1">
              Two flags · One logbook
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-tertiary font-semibold px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const disabled = item.needsContract && !hasContract;
                return (
                  <Link
                    key={item.path}
                    to={disabled ? "#" : item.path}
                    onClick={(e) => { if (disabled) e.preventDefault(); }}
                    className={`sidebar-nav-item ${isActive(item.path) ? "active" : ""} ${disabled ? "disabled" : ""}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-card-border">
        <div className="flex items-center justify-center">
          <ConnectButton accountStatus="avatar" showBalance={false} chainStatus="icon" />
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ hasContract, isActive, mobileMenu, setMobileMenu }: {
  hasContract: boolean;
  isActive: (p: string) => boolean;
  mobileMenu: boolean;
  setMobileMenu: (v: boolean) => void;
}) {
  return (
    <header className="lg:hidden shrink-0 bg-card/95 backdrop-blur-md border-b border-card-border z-50 pt-safe">
      <div className="px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 rounded-lg bg-navy/60 border border-card-border flex items-center justify-center">
            <DivechainMark className="w-7 h-auto" />
          </div>
          <span className="font-display text-lg font-bold tracking-[0.04em] text-white">
            DIVECHAIN
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ConnectButton accountStatus="avatar" showBalance={false} chainStatus="icon" />
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="p-2.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
          >
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenu && (
        <div className="border-t border-card-border bg-deep/95 backdrop-blur-md px-4 py-3 space-y-4 animate-fade-in">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">{group.label}</p>
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
                      className={`mobile-nav-item ${
                        isActive(item.path) ? "text-surf" : disabled ? "text-text-tertiary" : "text-gray-400"
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
  );
}

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
      <div className="aurora-bg" />
      <div className="grid-overlay" />

      <WalletConnectWarning />

      {/* Disconnected Header */}
      {!isConnected && (
        <header className="shrink-0 z-50 border-b border-card-border/50 bg-abyss/80 backdrop-blur-xl pt-safe">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0">
              <div className="w-10 h-10 rounded-lg bg-navy/60 border border-card-border flex items-center justify-center">
                <DivechainMark className="w-7 h-auto" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-2xl font-bold tracking-[0.04em] text-white leading-none">
                  DIVECHAIN
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary leading-none mt-1 hidden sm:block">
                  Two flags · One logbook
                </span>
              </div>
            </Link>
            <ConnectButton />
          </div>
        </header>
      )}

      {/* Connected layout: row on desktop, column on mobile */}
      {isConnected ? (
        <div className="flex-1 flex flex-col lg:flex-row relative">
          <Sidebar hasContract={hasContract} isActive={isActive} />

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <MobileHeader hasContract={hasContract} isActive={isActive} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />

            <main className="flex-1 relative z-10 flex flex-col min-h-0 pb-20 lg:pb-0">
              <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-1 pb-4 sm:pt-2 sm:pb-6 lg:pt-4 lg:pb-8 flex flex-col flex-1 min-h-0 w-full">
                <Outlet />
              </div>
            </main>

            {/* Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-card-border-bright z-50 pb-safe">
              <div className="flex justify-around py-1.5">
                {ALL_ITEMS.slice(0, 5).map((item) => {
                  const disabled = item.needsContract && !hasContract;
                  return (
                    <Link
                      key={item.path}
                      to={disabled ? "#" : item.path}
                      onClick={(e) => { if (disabled) e.preventDefault(); }}
                      className={`mobile-nav-item ${
                        isActive(item.path)
                          ? "text-surf"
                          : disabled
                          ? "text-text-tertiary"
                          : "text-gray-500"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      ) : (
        /* Disconnected: simple column */
        <main className="flex-1 relative z-10 flex flex-col min-h-0">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-1 pb-4 sm:pt-2 sm:pb-6 lg:pt-4 lg:pb-8 flex flex-col flex-1 min-h-0 w-full">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}
