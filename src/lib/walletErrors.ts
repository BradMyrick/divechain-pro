// Wallet-facing failure classification for batch sends. Pure helpers so the
// messaging is unit-tested and identical everywhere it appears.

/** Human-facing message for a thrown wallet/write error. */
export function walletErrorMessage(err: unknown): string {
  const msg = String((err as Error)?.message ?? err ?? "Transaction failed");
  if (/user rejected|request rejected|rejected the request|denied/i.test(msg))
    return "Request declined in the wallet — nothing was sent.";
  if (/not on allow|allowlist|unlisted domain|4100/i.test(msg))
    return "The wallet service blocked this domain (the dApp is not on its allowlist). Add the deployment domain to your Reown project, or connect with a browser-extension wallet.";
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
}

/** Guidance shown when a signing request has produced no transaction for a
 *  while. Tailored to how the wallet is connected. */
export function stalledWalletHint(connectorId: string | undefined): string {
  const id = (connectorId ?? "").toLowerCase();
  if (id.includes("walletconnect") || id.includes("coinbase") || id.includes("rainbow")) {
    return "Your wallet has not opened. For temporary deployments (e.g. *.vercel.app), the domain must be added to your Reown / WalletConnect project's allowed domains — or connect with a browser-extension wallet (MetaMask, Core, Rabby) instead.";
  }
  return "Your wallet has not opened. Check the wallet extension icon for a pending request — popup blockers can hide it. If it never appears, reload the page and retry: already-confirmed dives are skipped automatically.";
}
