import { avalanche, avalancheFuji } from "wagmi/chains";
import { createConfig, http, injected } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "";

// getDefaultConfig hard-throws (blank page) when projectId is empty. When the
// env var is missing, fall back to an injected-only config so desktop
// extension wallets (Core, MetaMask, Rabby) still work; the UI surfaces a
// banner explaining how to enable mobile / QR wallets.
export const config = walletConnectProjectId
  ? getDefaultConfig({
      appName: "DiveChain",
      appDescription: "Your sovereign, on-chain scuba logbook (ERC-8260) on Avalanche.",
      appUrl: "https://divechain.pro",
      appIcon: "https://divechain.pro/apple-touch-icon.png",
      projectId: walletConnectProjectId,
      chains: [avalanche, avalancheFuji],
      ssr: false,
    })
  : createConfig({
      chains: [avalanche, avalancheFuji],
      transports: {
        [avalanche.id]: http(),
        [avalancheFuji.id]: http(),
      },
      connectors: [injected()],
    });
