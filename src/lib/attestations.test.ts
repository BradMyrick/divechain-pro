import { describe, it, expect } from "vitest";
import { parseSignatureHandoff } from "./attestations";
import { parseLogbookRecord, isEnsName, isAddressRef } from "./ens";

function search(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

describe("attestation signature handoff", () => {
  const sig = "0x" + "ab".repeat(65);
  const base = { chain: "43113", contract: "0x5adF6d5150a62D67Fa1A18ac7ddE8fcbaD392565", dive: "7" };

  it("round-trips a valid handoff", () => {
    const h = parseSignatureHandoff(search({ ...base, nonce: "3", sig }));
    expect(h?.req.diveId).toBe(7n);
    expect(h?.nonce).toBe(3n);
    expect(h?.signature).toBe(sig);
  });

  it("rejects malformed signatures (fail closed)", () => {
    expect(parseSignatureHandoff(search({ ...base, nonce: "3", sig: "0xdeadbeef" }))).toBeNull();
    expect(parseSignatureHandoff(search({ ...base, nonce: "3", sig: sig.slice(0, -2) }))).toBeNull();
    expect(parseSignatureHandoff(search({ ...base, nonce: "-1", sig }))).toBeNull();
    expect(parseSignatureHandoff(search({ ...base, nonce: "3" }))).toBeNull();
  });
});

describe("ENS erc8260 record parsing", () => {
  const addr = "0x5adF6d5150a62D67Fa1A18ac7ddE8fcbaD392565";

  it("accepts chain-prefixed and bare records", () => {
    expect(parseLogbookRecord(`avax:${addr}`)).toEqual({ logbook: addr, chainId: 43114 });
    expect(parseLogbookRecord(`fuji:${addr}`)).toEqual({ logbook: addr, chainId: 43113 });
    expect(parseLogbookRecord(addr)).toEqual({ logbook: addr, chainId: 43114 });
  });

  it("rejects unknown chains and garbage (fail closed)", () => {
    expect(parseLogbookRecord(`eth:${addr}`)).toBeNull();
    expect(parseLogbookRecord("not an address")).toBeNull();
    expect(parseLogbookRecord("")).toBeNull();
  });

  it("classifies route refs", () => {
    expect(isEnsName("billybones.eth")).toBe(true);
    expect(isEnsName("0x1234")).toBe(false);
    expect(isAddressRef(addr)).toBe(true);
    expect(isAddressRef("0x123")).toBe(false);
    expect(isAddressRef("0x" + "0".repeat(41) + "1")).toBe(false); // bad checksum length-42
  });
});
