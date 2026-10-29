// Measured on C-Chain mainnet, Oct 2026 (Routescan). Update if contracts change.
export const COSTS = {
  claimGas: "about 3.1M gas",
  claimAvax: "about 0.005 AVAX",
  perDiveAvax: "about 0.001 AVAX",
  starterAvax: "0.05 AVAX", // covers the claim plus roughly 50 dives
  plain: "a few cents to claim, under a cent per dive",
} as const;
