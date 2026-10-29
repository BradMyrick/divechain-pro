export const LINKS = {
  site: "https://divechain.pro",
  github: "https://github.com/BradMyrick/divechain-pro",
  eipPr: "https://github.com/ethereum/ERCs/pull/1735",
  x: "https://x.com/dive_chain",
  founderX: "https://x.com/kodr_pro",
  linkedin: "https://www.linkedin.com/in/kodr-pro",
  founderSite: "https://kodr.pro",
  email: "mailto:brad@kodr.pro",
  snowtraceFactory:
    "https://snowtrace.io/address/0x3894070DDdA804f9ba96116c9bd810eF745f5999",
} as const;

/** Render a link only when its value is a real URL (no placeholder). */
export const live = (url: string) => !url.includes("TODO");
