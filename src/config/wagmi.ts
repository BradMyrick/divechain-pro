import { avalanche, avalancheFuji } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const config = getDefaultConfig({
  appName: "Divechain",
  projectId: "70a3137c4b8369465907036fa8867c39",
  chains: [avalancheFuji, avalanche],
  ssr: true,
});
