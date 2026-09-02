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
      appName: "Divechain",
      projectId: walletConnectProjectId,
      chains: [avalancheFuji, avalanche],
      ssr: true,
    })
  : createConfig({
      chains: [avalancheFuji, avalanche],
      transports: {
        [avalancheFuji.id]: http(),
        [avalanche.id]: http(),
      },
      connectors: [injected()],
    });
