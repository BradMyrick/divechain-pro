import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveInput } from "../lib/types";

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

  const { data: diveCount } = useRead("diveCount");
  const { data: owner } = useRead("owner");
  const { data: allDiveIds } = useRead("getAllDiveIds");

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

  const useAttestations = (diveId: bigint) =>
    useReadContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "getAttestations",
      args: [diveId],
      query: { enabled: !!contractAddress && diveId > 0n },
    });

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

  /** Relay an EIP-712 attestation. Any account may submit; attester is recovered from the signature. */
  const attestDive = (diveId: bigint, nonce: bigint, signature: `0x${string}`) => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "attestDive",
      args: [diveId, nonce, signature],
    });
  };

  const isOwner =
    !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();

  return {
    diveCount: diveCount as bigint | undefined,
    owner: owner as `0x${string}` | undefined,
    allDiveIds: allDiveIds as bigint[] | undefined,
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
