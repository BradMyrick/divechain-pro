import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/": "DiveChain | Your dive log, on-chain, forever",
  "/tools": "Dive planning tools | DiveChain",
  "/dive-sites": "Dive sites | DiveChain",
  "/demo": "Demo logbook | DiveChain",
  "/about": "About | DiveChain",
  "/community": "Community | DiveChain",
  "/deploy": "Claim your logbook | DiveChain",
  "/logbook": "Logbook | DiveChain",
  "/log-dive": "Log a dive | DiveChain",
  "/profile": "Diver profile | DiveChain",
  "/attest": "Buddy attestation | DiveChain",
};

export function useRouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const diverMatch = path.match(/^\/diver\//);
    const diveMatch = path.match(/^\/logbook\/\d+$/);
    document.title = diverMatch
      ? "Public diver | DiveChain"
      : diveMatch
        ? "Dive detail | DiveChain"
        : (TITLES[path] ?? "DiveChain");

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `https://divechain.pro${path === "/" ? "/" : path}`;
  }, [pathname]);
}
