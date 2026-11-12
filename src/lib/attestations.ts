// EIP-712 typed-data helpers for ERC-8260 v2 attestations.
// Must match deployment/src/interfaces/IDiveLogTypedData.sol exactly:
//   domain  : EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)
//             name="DiveLog", version="2"
//   type    : Attestation(uint256 diveId,bytes32 contentHash,address verifyingContract,uint256 nonce)
//
// The domain version and typed-data layout are one-way doors: every deployed
// contract and the ERC standard itself depend on them.

export const DIVELOG_EIP712_DOMAIN = {
  name: "DiveLog",
  version: "2",
} as const;

/** viem/wagmi typed-data definition for the Attestation struct. */
export const ATTESTATION_TYPES = {
  Attestation: [
    { name: "diveId", type: "uint256" },
    { name: "contentHash", type: "bytes32" },
    { name: "verifyingContract", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface AttestationRequest {
  chainId: number;
  contractAddress: `0x${string}`;
  diveId: bigint;
}

/** Build the wagmi signTypedData payload for a buddy attesting a dive.
 *  `contentHash` is the dive's stored SHA-256 (read from getDive), so the
 *  signature binds to the exact UDDF profile bytes, not just the id. */
export function buildAttestationTypedData(
  chainId: number,
  verifyingContract: `0x${string}`,
  diveId: bigint,
  contentHash: `0x${string}`,
  nonce: bigint,
) {
  return {
    domain: {
      ...DIVELOG_EIP712_DOMAIN,
      chainId: BigInt(chainId),
      verifyingContract,
    },
    types: ATTESTATION_TYPES,
    primaryType: "Attestation" as const,
    message: {
      diveId,
      contentHash,
      verifyingContract,
      nonce,
    },
  };
}

/** Encode an attestation request into a shareable URL search-string. The
 *  attesting device reads the stored contentHash from the logbook, so the
 *  URL stays short. */
export function buildAttestationRequestParams(req: AttestationRequest): URLSearchParams {
  const p = new URLSearchParams();
  p.set("chain", String(req.chainId));
  p.set("contract", req.contractAddress);
  p.set("dive", req.diveId.toString());
  return p;
}

export function parseAttestationRequestParams(
  search: URLSearchParams,
): AttestationRequest | null {
  const chain = search.get("chain");
  const contract = search.get("contract");
  const dive = search.get("dive");
  if (!chain || !contract || !dive) return null;
  if (!contract.startsWith("0x") || contract.length !== 42) return null;
  return {
    chainId: Number(chain),
    contractAddress: contract as `0x${string}`,
    diveId: BigInt(dive),
  };
}

export interface SignatureHandoff {
  req: AttestationRequest;
  nonce: bigint;
  signature: `0x${string}`;
}

/** A signed attestation handed to another device, the diver (or anyone) relays it. */
export function buildSignatureHandoffUrl(
  req: AttestationRequest,
  nonce: bigint,
  signature: `0x${string}`,
): string {
  const p = buildAttestationRequestParams(req);
  p.set("nonce", nonce.toString());
  p.set("sig", signature);
  return `${window.location.origin}/attest?${p.toString()}`;
}

export function parseSignatureHandoff(search: URLSearchParams): SignatureHandoff | null {
  const req = parseAttestationRequestParams(search);
  const nonce = search.get("nonce");
  const sig = search.get("sig");
  if (!req || !nonce || !sig) return null;
  if (!/^0x[0-9a-fA-F]{130}$/.test(sig)) return null;
  if (!/^\d+$/.test(nonce)) return null;
  return { req, nonce: BigInt(nonce), signature: sig as `0x${string}` };
}
