import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { BrowserRouter } from "react-router-dom";
import { DiveContractProvider } from "./contexts/DiveContractContext";
import { config } from "./config/wagmi";
import App from "./App";

// Self-hosted fonts (no third-party CDN requests)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#22d3ee",
            accentColorForeground: "#02070d",
            overlayBlur: "large",
            borderRadius: "medium",
            fontStack: "system",
          })}
          appInfo={{
            appName: "Divechain",
            learnMoreUrl: "https://github.com/BradMyrick/divechain-pro",
          }}
        >
          <BrowserRouter>
            <DiveContractProvider>
              <App />
            </DiveContractProvider>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
