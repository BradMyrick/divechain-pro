import { walletConnectProjectId } from "../config/wagmi";

/** Shown when VITE_WALLETCONNECT_PROJECT_ID is unset: desktop wallets work,
 *  mobile / QR wallets do not until the env var is provided. */
export default function WalletConnectWarning() {
  if (walletConnectProjectId) return null;
  return (
    <div className="relative z-50 bg-warn/10 border-b border-warn/40 text-warn text-xs sm:text-sm px-4 py-2 text-center leading-snug">
      WalletConnect is disabled — set{" "}
      <code className="font-mono text-[0.85em]">VITE_WALLETCONNECT_PROJECT_ID</code> in{" "}
      <code className="font-mono text-[0.85em]">.env.local</code> to enable mobile &amp; QR
      wallets. Desktop extension wallets still work.
    </div>
  );
}
