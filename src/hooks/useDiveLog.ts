import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI, UnitSystem } from "../lib/contracts";

export function useDiveLog(contractAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const useRead = (
    functionName: string,
    args?: unknown[],
  ) =>
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

  const { writeContract, data: txHash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const logDive = (
    input: {
      diveDate: bigint;
      units: UnitSystem;
      data: Record<string, unknown>;
      env: Record<string, unknown>;
      decomp: Record<string, unknown>;
      gas: Record<string, unknown>;
      remarks: string;
    },
  ) => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: SOVEREIGN_DIVE_LOG_ABI,
      functionName: "logDive",
      args: [input],
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

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  return {
    diveCount: diveCount as bigint | undefined,

    owner: owner as `0x${string}` | undefined,
    allDiveIds: allDiveIds as bigint[] | undefined,
    isOwner: !!isOwner,
    useDive,
    useVoidInfo,
    useAttestations,
    logDive,

    voidDive,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
