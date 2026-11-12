import { useMemo } from "react";
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveInput, Attestation } from "../lib/types";

export function useDiveLog(contractAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const useRead = (functionName: string, args?: unknown[]) =>
    useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName,
      args,
      query: { enabled: !!contractAddress },
    });

  const { data: diveCount } = useRead("getDiveCount");
  const { data: owner } = useRead("owner");

  const useDive = (diveId: bigint) =>
    useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "getDive",
      args: [diveId],
      query: { enabled: !!contractAddress && diveId > 0n },
    });

  const useVoidInfo = (diveId: bigint) =>
    useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "getVoidInfo",
      args: [diveId],
      query: { enabled: !!contractAddress && diveId > 0n },
    });

  /** Attestations for a dive via the bounded v2 accessors: count, then each
   *  index. Returns the same Attestation[] shape callers always had. */
  const useAttestations = (diveId: bigint) => {
    const { data: count, isLoading } = useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "attestationCount",
      args: [diveId],
      query: { enabled: !!contractAddress && diveId > 0n },
    });
    const n = count !== undefined ? Number(count) : 0;
    const contracts = useMemo(
      () =>
        Array.from({ length: n }, (_, j) => ({
          address: contractAddress,
          abi: SOVEREIGN_DIVE_LOG_ABI,
          functionName: "getAttestation",
          args: [diveId, BigInt(j)],
        })),
      [diveId, n],
    );
    const { data: raw } = useReadContracts({
      contracts: contracts as never,
      query: { enabled: !!contractAddress && diveId > 0n && n > 0 },
    });
    const attestations = useMemo(() => {
      const results =
        raw as readonly { status: "success" | "failure"; result?: unknown }[] | undefined;
      if (!results) return [] as Attestation[];
      return results
        .filter((r) => r.status === "success" && r.result)
        .map((r) => r.result as Attestation);
    }, [raw]);
    return { attestations, isLoading };
  };

  const useAttesterNonce = (attester: `0x${string}` | undefined) =>
    useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "attesterNonce",
      args: [attester],
      query: { enabled: !!contractAddress && !!attester },
    });

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const logDive = (input: DiveInput) => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "logDive",
      args: [input],
    });
  };

  const batchLogDives = (inputs: DiveInput[]) => {
    if (!contractAddress || inputs.length === 0) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "batchLogDives",
      args: [inputs],
    });
  };

  const voidDive = (diveId: bigint, supersededById: bigint, reason: string) => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "voidDive",
      args: [diveId, supersededById, reason],
    });
  };

  /** Relay an EIP-712 attestation. Any account may submit; the attester is
   *  recovered from the signature, which binds the stored contentHash. */
  const attestDive = (
    diveId: bigint,
    contentHash: `0x${string}`,
    nonce: bigint,
    signature: `0x${string}`,
  ) => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "attestDive",
      args: [diveId, contentHash, nonce, signature],
    });
  };

  const isOwner =
    !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();

  return {
    diveCount: diveCount as bigint | undefined,
    owner: owner as `0x${string}` | undefined,
    isOwner: !!isOwner,
    useDive,
    useVoidInfo,
    useAttestations,
    useAttesterNonce,
    logDive,
    batchLogDives,
    voidDive,
    attestDive,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
