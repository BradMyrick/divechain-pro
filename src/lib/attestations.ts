// EIP-712 typed-data helpers for ERC-8260 attestations.
// Must match deployment/src/interfaces/IDiveLogTypedData.sol exactly:
//   domain  : EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)
//             name="DiveLog", version="1"
//   type    : Attestation(uint256 diveId,address verifyingContract,uint256 nonce)

export const DIVELOG_EIP712_DOMAIN = {
  name: "DiveLog",
  version: "1",
} as const;

/** viem/wagmi typed-data definition for the Attestation struct. */
export const ATTESTATION_TYPES = {
  Attestation: [
    { name: "diveId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface AttestationRequest {
  chainId: number;
  contractAddress: `0x${string}`;
  diveId: bigint;
}

/** Build the wagmi signTypedData payload for a buddy attesting a dive. */
export function buildAttestationTypedData(
  chainId: number,
  verifyingContract: `0x${string}`,
  diveId: bigint,
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
      verifyingContract,
      nonce,
    },
  };
}

/** Encode an attestation request into a shareable URL search-string. */
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
