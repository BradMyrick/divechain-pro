import { avalanche, avalancheFuji } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const config = getDefaultConfig({
  appName: "Divechain",
  projectId: "divechain-demo-app",
  chains: [avalancheFuji, avalanche],
  ssr: true,
});
