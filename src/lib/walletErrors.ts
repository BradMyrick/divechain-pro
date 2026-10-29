// Wallet-facing failure classification for batch sends. Pure helpers so the
// messaging is unit-tested and identical everywhere it appears.

/** True for RPC nonce races: the broadcast was rejected, nothing executed,
 *  and the same request is safe to send again. Happens when a public RPC's
 *  view lags behind Avalanche's sub-second finality right after a prior tx
 *  is confirmed — the wallet builds the next tx with a stale nonce. The
 *  Foundry broadcaster passes --slow for the same reason. */
export function isNonceRaceError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? "");
  return /nonce too low|nonce has already been used|already known/i.test(msg);
}

/** Human-facing message for a thrown wallet/write error. */
export function walletErrorMessage(err: unknown): string {
  const msg = String((err as Error)?.message ?? err ?? "Transaction failed");
  if (isNonceRaceError(msg))
    return "The RPC was briefly behind your account's transaction count (stale nonce) — nothing was logged in this batch; retrying or resuming is safe.";
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
