import { useCallback, useRef, useState } from "react";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config } from "../config/wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveInput } from "../lib/types";
import { walletErrorMessage, stalledWalletHint } from "../lib/walletErrors";

export type BatchTxStatus = "queued" | "signing" | "sent" | "confirmed" | "failed" | "stopped";

export interface BatchTx {
  index: number;
  diveCount: number;
  status: BatchTxStatus;
  hash?: `0x${string}`;
  error?: string;
  /** The wallet request is still pending but nothing has happened for a
   *  while — surfaced with actionable guidance instead of silence. */
  stalled?: boolean;
}

interface ChunkRef {
  index: number;
  dives: DiveInput[];
}

/** How long a signing request may produce nothing before we flag it. */
const STALL_TIMEOUT_MS = 30_000;

/**
 * Sequential batchLogDives sender: one wallet request at a time, each
 * transaction confirmed before the next is signed (SPEC-6 — chunking happens
 * client-side; this loop never approaches MAX_BATCH_SIZE in one call).
 *
 * Safety properties:
 *  - resume() only re-sends chunks that definitely did not leave the wallet
 *    (queued / stopped / failed — never one still in flight), so a hung
 *    request that later lands can never be double-sent;
 *  - a stalled wallet request is flagged with guidance instead of hanging
 *    silently (popup blockers, unlisted temporary domains);
 *  - confirmed dives are permanent, so a partial run is always safe to
 *    continue — the same idempotency the Foundry broadcaster had.
 */
export function useBatchSend(
  contractAddress: `0x${string}` | undefined,
  chainId: number | undefined,
  connectorId: string | undefined,
) {
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
            ? { ...t, status: "queued" as const, error: undefined, stalled: false }
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
          patch(index, { status: "signing", error: undefined, stalled: false });
          console.info(`[batch-send] tx ${index + 1}/${list.length}: requesting signature (${dives.length} dives)`);
          // Watchdog: if the wallet never opens / never responds, say so.
          const stallTimer = setTimeout(() => {
            patch(index, { stalled: true, error: stalledWalletHint(connectorId) });
          }, STALL_TIMEOUT_MS);
          try {
            const hash = await writeContractAsync({
              address: contractAddress,
              abi: SOVEREIGN_DIVE_LOG_ABI,
              functionName: "batchLogDives",
              args: [dives],
              // Explicit chain: the wallet prompts to switch instead of
              // silently aiming the write at whatever chain it is on.
              ...(chainId !== undefined ? { chainId } : {}),
            });
            clearTimeout(stallTimer);
            patch(index, { status: "sent", hash, stalled: false, error: undefined });
            const receipt = await waitForTransactionReceipt(config, { hash });
            if (receipt.status === "success") {
              patch(index, { status: "confirmed", stalled: false });
            } else {
              patch(index, { status: "failed", error: "Transaction reverted on-chain — nothing was logged in this batch", stalled: false });
              break;
            }
          } catch (err) {
            clearTimeout(stallTimer);
            console.error(`[batch-send] tx ${index + 1}: failed`, err);
            patch(index, { status: "failed", error: walletErrorMessage(err), stalled: false });
            break;
          }
        }
      } finally {
        setRunning(false);
      }
    },
    [contractAddress, chainId, connectorId, writeContractAsync, patch],
  );

  const send = useCallback(
    (chunks: DiveInput[][]) => {
      chunksRef.current = chunks.map((dives, index) => ({ index, dives }));
      setTxs(chunks.map((dives, index) => ({ index, diveCount: dives.length, status: "queued" as const })));
      // Diagnostic breadcrumb: everything a remote debugging session needs.
      console.info("[batch-send] starting", {
        chunks: chunks.length,
        dives: chunks.reduce((a, c) => a + c.length, 0),
        logbook: contractAddress,
        chainId,
        connectorId,
        chunk0FirstDive: chunks[0]?.[0],
      });
      void runLoop(chunksRef.current);
    },
    [runLoop, contractAddress, chainId, connectorId],
  );

  const resume = useCallback(() => {
    // Only chunks that never produced a request that could still land.
    // "signing"/"sent" stay untouched: their request is in flight, and
    // re-sending it could double-log permanent dives.
    const pending = chunksRef.current.filter(({ index }) => {
      const t = txs.find((x) => x.index === index);
      return !t || t.status === "queued" || t.status === "stopped" || t.status === "failed";
    });
    void runLoop(pending);
  }, [txs, runLoop]);

  return { txs, running, send, resume, stop };
}
