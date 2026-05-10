import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { BrowserRouter } from "react-router-dom";
import { DiveContractProvider } from "./contexts/DiveContractContext";
import { config } from "./config/wagmi";
import App from "./App";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#0d9488",
            accentColorForeground: "white",
            overlayBlur: "small",
          })}
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
