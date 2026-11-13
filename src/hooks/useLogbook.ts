/* eslint-disable @typescript-eslint/no-explicit-any */
// Normalizer consumes loosely-typed viem decodings; explicit any is scoped here only.
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveHeader, VoidInfo, Attestation } from "../lib/types";
import type { NormalizedDive } from "../lib/diverStats";
import { getProfile } from "../lib/profileVault";
import { DEMO_DIVES } from "../demo/fixtures";

/**
 * Normalize a viem-decoded DiveHeader (bigint numerics) to the number-based
 * shape declared in src/lib/types.ts. id stays bigint.
 */
export function normalizeDive(raw: unknown): DiveHeader {
  const d = raw as Record<string, any>;
  const num = (v: unknown): number => (typeof v === "bigint" ? Number(v) : Number(v ?? 0));
  return {
    id: BigInt(d.id),
    diveDate: num(d.diveDate),
    startTime: num(d.startTime),
    maxDepth: num(d.maxDepth),
    durationSeconds: num(d.durationSeconds),
    bottomTimeSeconds: num(d.bottomTimeSeconds),
    mode: num(d.mode),
    units: num(d.units),
    o2Bps: num(d.o2Bps),
    heBps: num(d.heBps),
    tableSchedule: (d.tableSchedule ?? "0x" + "0".repeat(32)) as `0x${string}`,
    surfaceIntervalSeconds: num(d.surfaceIntervalSeconds),
    repetitiveGroup: (d.repetitiveGroup ?? "0x00") as `0x${string}`,
    repetitiveGroupAfterSI: (d.repetitiveGroupAfterSI ?? "0x00") as `0x${string}`,
    coarseGeohash: (d.coarseGeohash ?? "0x00000000") as `0x${string}`,
    contentHash: (d.contentHash ?? "0x" + "0".repeat(64)) as `0x${string}`,
    profileURI: String(d.profileURI ?? ""),
  };
}

export interface LogbookData {
  address: `0x${string}` | undefined;
  owner: `0x${string}` | undefined;
  diveCount: number | undefined;
  dives: NormalizedDive[];
  isLoading: boolean;
  isDemo: boolean;
}

/**
 * Read a logbook efficiently with batched useReadContracts calls:
 *  - getDiveCount + owner: 2 reads
 *  - headers: getDive per id (ids are sequential 1..count, per ERC-8260 v2;
 *    the standard intentionally has no unbounded array getters)
 *  - void info + attestation counts: one read per dive
 *  - attestations: getAttestation(id, i) per index, second batched phase
 * Rich profile data joins from the local vault when this device holds it.
 */
export function useLogbookData(
  address: `0x${string}` | undefined,
  opts: { demo?: boolean } = {},
): LogbookData {
  const demo = !!opts.demo && !address;

  const { data: countData, isLoading: countLoading } = useReadContract({
    address,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "getDiveCount",
    query: { enabled: !!address },
  });
  const { data: ownerData, isLoading: ownerLoading } = useReadContract({
    address,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "owner",
    query: { enabled: !!address },
  });

  const diveCount = countData !== undefined ? Number(countData) : undefined;
  const ids = useMemo(
    () => (diveCount ? Array.from({ length: diveCount }, (_, i) => BigInt(i + 1)) : []),
    [diveCount],
  );

  const contracts = useMemo(() => {
    const list: unknown[] = [];
    for (const id of ids) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "getDive", args: [id] });
    }
    for (const id of ids) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "getVoidInfo", args: [id] });
    }
    for (const id of ids) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "attestationCount", args: [id] });
    }
    return list;
  }, [address, ids]);

  const { data: batchRaw, isLoading: batchLoading } = useReadContracts({
    contracts: contracts as never,
    query: { enabled: !!address && ids.length > 0 },
  });
  const batchResults =
    batchRaw as readonly { status: "success" | "failure"; result?: unknown }[] | undefined;

  const headers = useMemo<DiveHeader[]>(() => {
    if (!batchResults) return [];
    const list: DiveHeader[] = [];
    for (let i = 0; i < ids.length; i++) {
      const r = batchResults[i];
      if (r?.status === "success" && r.result) list.push(normalizeDive(r.result));
    }
    return list;
  }, [batchResults, ids.length]);

  const attCounts = useMemo<number[]>(() => {
    if (!batchResults) return [];
    const base = ids.length * 2;
    return ids.map((_, i) => {
      const r = batchResults[base + i];
      return r?.status === "success" ? Number(r.result ?? 0) : 0;
    });
  }, [batchResults, ids]);

  // Phase 2: fetch each attestation by index (bounded reads per the standard).
  const attContracts = useMemo(() => {
    const list: unknown[] = [];
    headers.forEach((h, i) => {
      for (let j = 0; j < (attCounts[i] ?? 0); j++) {
        list.push({
          address,
          abi: SOVEREIGN_DIVE_LOG_ABI,
          functionName: "getAttestation",
          args: [h.id, BigInt(j)],
        });
      }
    });
    return list;
  }, [address, headers, attCounts]);

  const { data: attRaw } = useReadContracts({
    contracts: attContracts as never,
    query: { enabled: !!address && attContracts.length > 0 },
  });

  const dives = useMemo<NormalizedDive[]>(() => {
    if (demo) return DEMO_DIVES;
    const attResults =
      attRaw as readonly { status: "success" | "failure"; result?: unknown }[] | undefined;
    let attCursor = 0;
    return headers.map((h, i) => {
      const v = batchResults?.[ids.length + i];
      const atts: Attestation[] = [];
      for (let j = 0; j < (attCounts[i] ?? 0); j++) {
        const r = attResults?.[attCursor++];
        if (r?.status === "success" && r.result) atts.push(r.result as Attestation);
      }
      const stored = getProfile(h.contentHash);
      return {
        ...h,
        draft: stored?.draft,
        voidInfo: v?.status === "success" ? (v.result as VoidInfo) : undefined,
        attestations: atts,
      };
    });
  }, [demo, headers, attCounts, attRaw, batchResults, ids.length]);

  const isLoading =
    !!address && (countLoading || ownerLoading || (ids.length > 0 && batchLoading));

  if (demo) {
    return {
      address: undefined,
      owner: undefined,
      diveCount: DEMO_DIVES.length,
      dives: DEMO_DIVES,
      isLoading: false,
      isDemo: true,
    };
  }

  return {
    address,
    owner: ownerData as `0x${string}` | undefined,
    diveCount,
    dives,
    isLoading,
    isDemo: false,
  };
}
