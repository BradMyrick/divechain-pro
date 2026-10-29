import { describe, it, expect } from "vitest";
import { walletErrorMessage, stalledWalletHint, isNonceRaceError } from "./walletErrors";

describe("isNonceRaceError", () => {
  it("matches the Fuji failure modes", () => {
    expect(isNonceRaceError(new Error('Custom eth_sendRawTransaction: nonce too low: next nonce 33, tx nonce 32'))).toBe(true);
    expect(isNonceRaceError(new Error("nonce has already been used"))).toBe(true);
    expect(isNonceRaceError(new Error("already known"))).toBe(true);
  });

  it("does not match unrelated failures", () => {
    expect(isNonceRaceError(new Error("User rejected the request"))).toBe(false);
    expect(isNonceRaceError(new Error("insufficient funds for gas"))).toBe(false);
    expect(isNonceRaceError(undefined)).toBe(false);
  });
});

describe("walletErrorMessage", () => {
  it("classifies nonce races as safe-to-retry", () => {
    const msg = walletErrorMessage(new Error("nonce too low: next nonce 33, tx nonce 32"));
    expect(msg).toContain("stale nonce");
    expect(msg).toContain("safe");
  });
  it("classifies user rejections", () => {
    expect(walletErrorMessage(new Error("User rejected the request"))).toContain("declined in the wallet");
    expect(walletErrorMessage(new Error("MetaMask Tx Signature: User denied transaction request"))).toContain(
      "declined in the wallet",
    );
  });

  it("classifies allowlist blocks", () => {
    expect(walletErrorMessage(new Error("App not on allowlist for this projectId"))).toContain("allowlist");
  });

  it("truncates long technical errors but keeps the start", () => {
    const msg = walletErrorMessage(new Error("x".repeat(500)));
    expect(msg.length).toBeLessThanOrEqual(302);
    expect(msg.endsWith("…")).toBe(true);
  });

  it("passes through short unknown errors", () => {
    expect(walletErrorMessage(new Error("boom"))).toBe("boom");
    expect(walletErrorMessage(undefined)).toBe("Transaction failed");
  });
});

describe("stalledWalletHint", () => {
  it("points WalletConnect-style connectors at the domain allowlist", () => {
    const hint = stalledWalletHint("walletConnect");
    expect(hint).toContain("Reown");
    expect(hint).toContain("allowed domains");
  });

  it("points injected connectors at popup blocking / the extension icon", () => {
    const hint = stalledWalletHint("injected");
    expect(hint).toContain("extension icon");
    expect(hint).toContain("reload");
  });
});
