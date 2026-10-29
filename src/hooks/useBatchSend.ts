import { useCallback, useRef, useState } from "react";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config } from "../config/wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveInput } from "../lib/types";

export type BatchTxStatus = "queued" | "signing" | "sent" | "confirmed" | "failed" | "stopped";

export interface BatchTx {
  index: number;
  diveCount: number;
  status: BatchTxStatus;
  hash?: `0x${string}`;
  error?: string;
}

interface ChunkRef {
  index: number;
  dives: DiveInput[];
}

/**
 * Sequential batchLogDives sender: one MetaMask request at a time, each
 * transaction confirmed before the next is signed (SPEC-6 — chunking happens
 * client-side; this loop never approaches MAX_BATCH_SIZE in one call).
 *
 * Failed or stopped runs resume by re-sending only the chunks that have not
 * confirmed. Confirmed dives are permanent, so a partial run is always safe
 * to continue — the same idempotency the Foundry broadcaster had.
 */
export function useBatchSend(contractAddress: `0x${string}` | undefined) {
  const { writeContractAsync } = useWriteContract();
  const [txs, setTxs] = useState<BatchTx[]>([]);
  const [running, setRunning] = useState(false);
  const chunksRef = useRef<ChunkRef[]>([]);
  const stopRef = useRef(false);

  const patch = useCallback((index: number, update: Partial<BatchTx>) => {
    setTxs((prev) => prev.map((t) => (t.index === index ? { ...t, ...update } : t)));
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const runLoop = useCallback(
    async (list: ChunkRef[]) => {
      if (!contractAddress || list.length === 0) return;
      stopRef.current = false;
      setRunning(true);
      const inList = new Set(list.map((l) => l.index));
      setTxs((prev) =>
        prev.map((t) =>
          inList.has(t.index) && t.status !== "confirmed"
            ? { ...t, status: "queued" as const, error: undefined }
            : t,
        ),
      );
      try {
        for (const { index, dives } of list) {
          if (stopRef.current) {
            setTxs((prev) =>
              prev.map((t) => (t.index >= index && t.status === "queued" ? { ...t, status: "stopped" } : t)),
            );
            break;
          }
          patch(index, { status: "signing" });
          try {
            const hash = await writeContractAsync({
              address: contractAddress,
              abi: SOVEREIGN_DIVE_LOG_ABI,
              functionName: "batchLogDives",
              args: [dives],
            });
            patch(index, { status: "sent", hash });
            const receipt = await waitForTransactionReceipt(config, { hash });
            if (receipt.status === "success") {
              patch(index, { status: "confirmed" });
            } else {
              patch(index, { status: "failed", error: "Transaction reverted on-chain — nothing was logged in this batch" });
              break;
            }
          } catch (err) {
            const msg = (err as Error)?.message ?? "Transaction failed";
            patch(index, { status: "failed", error: msg.slice(0, 300) });
            break;
          }
        }
      } finally {
        setRunning(false);
      }
    },
    [contractAddress, writeContractAsync, patch],
  );

  const send = useCallback(
    (chunks: DiveInput[][]) => {
      chunksRef.current = chunks.map((dives, index) => ({ index, dives }));
      setTxs(chunks.map((dives, index) => ({ index, diveCount: dives.length, status: "queued" as const })));
      void runLoop(chunksRef.current);
    },
    [runLoop],
  );

  const resume = useCallback(() => {
    const pending = chunksRef.current.filter(({ index }) => {
      const t = txs.find((x) => x.index === index);
      return !t || t.status !== "confirmed";
    });
    void runLoop(pending);
  }, [txs, runLoop]);

  return { txs, running, send, resume, stop };
}
