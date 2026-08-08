import { avalanche, avalancheFuji } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const config = getDefaultConfig({
  appName: "Divechain",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [avalancheFuji, avalanche],
  ssr: true,
});
