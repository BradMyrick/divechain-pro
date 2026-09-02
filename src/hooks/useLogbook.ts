/* eslint-disable @typescript-eslint/no-explicit-any */
// Normalizer consumes loosely-typed viem decodings; explicit any is scoped here only.
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { SOVEREIGN_DIVE_LOG_ABI } from "../lib/contracts";
import type { DiveLog, VoidInfo, Attestation } from "../lib/types";
import type { NormalizedDive } from "../lib/diverStats";
import { DEMO_DIVES } from "../demo/fixtures";

const CHUNK_SIZE = 100;

/**
 * Normalize a viem-decoded DiveLog (bigint numerics) to the number-based shape
 * declared in src/lib/types.ts. id stays bigint.
 */
export function normalizeDive(raw: unknown): DiveLog {
  const d = raw as Record<string, any>;
  const num = (v: unknown): number => (typeof v === "bigint" ? Number(v) : Number(v ?? 0));
  return {
    id: BigInt(d.id),
    diveDate: num(d.diveDate),
    units: num(d.units),
    data: {
      leaveSurfaceTime: num(d.data?.leaveSurfaceTime),
      leaveBottomTime: num(d.data?.leaveBottomTime),
      reachSurfaceTime: num(d.data?.reachSurfaceTime),
      bottomTimeMinutes: num(d.data?.bottomTimeMinutes),
      maxDepth: num(d.data?.maxDepth),
      averageDepth: num(d.data?.averageDepth),
      mode: num(d.data?.mode),
      purpose: num(d.data?.purpose),
      suit: num(d.data?.suit),
    },
    env: {
      airTemp: num(d.env?.airTemp),
      waterTemp: num(d.env?.waterTemp),
      currentKnots: num(d.env?.currentKnots),
      bottomType: num(d.env?.bottomType),
      coords: {
        latitude: num(d.env?.coords?.latitude),
        longitude: num(d.env?.coords?.longitude),
      },
      location: String(d.env?.location ?? ""),
      weatherConditions: String(d.env?.weatherConditions ?? ""),
    },
    decomp: {
      decompType: num(d.decomp?.decompType),
      totalDecompTimeMinutes: num(d.decomp?.totalDecompTimeMinutes),
      maxDepthAttained: num(d.decomp?.maxDepthAttained),
      tableSchedule: (d.decomp?.tableSchedule ?? "0x" + "0".repeat(64)) as `0x${string}`,
      repetitiveGroup: (d.decomp?.repetitiveGroup ?? "0x00") as `0x${string}`,
      surfaceIntervalMinutes: num(d.decomp?.surfaceIntervalMinutes),
      newRepetitiveGroup: (d.decomp?.newRepetitiveGroup ?? "0x00") as `0x${string}`,
    },
    gas: {
      gasType: num(d.gas?.gasType),
      o2Percent: num(d.gas?.o2Percent),
      hePercent: num(d.gas?.hePercent),
      n2Percent: num(d.gas?.n2Percent),
      cylinderPressureIn: num(d.gas?.cylinderPressureIn),
      cylinderPressureOut: num(d.gas?.cylinderPressureOut),
      gasConsumed: num(d.gas?.gasConsumed),
      bailoutPressure: num(d.gas?.bailoutPressure),
    },
    remarks: String(d.remarks ?? ""),
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
 * Read a logbook efficiently with a single useReadContracts batch:
 *  - diveCount + owner: 2 reads
 *  - dives: getMultipleDives in chunks of 100
 *  - void info + attestations: one read per dive
 * Replaces the old per-component hook chain (3 RPCs per dive).
 * Dive IDs are derived 1..count — ERC-8260 guarantees sequential IDs from 1.
 */
export function useLogbookData(
  address: `0x${string}` | undefined,
  opts: { demo?: boolean } = {},
): LogbookData {
  const demo = !!opts.demo && !address;

  const { data: countData, isLoading: countLoading } = useReadContract({
    address,
    abi: SOVEREIGN_DIVE_LOG_ABI,
    functionName: "diveCount",
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
    const chunks: bigint[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE));
    for (const chunk of chunks) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "getMultipleDives", args: [chunk] });
    }
    for (const id of ids) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "getVoidInfo", args: [id] });
    }
    for (const id of ids) {
      list.push({ address, abi: SOVEREIGN_DIVE_LOG_ABI, functionName: "getAttestations", args: [id] });
    }
    return list;
  }, [address, ids]);

  const { data: batchRaw, isLoading: batchLoading } = useReadContracts({
    contracts: contracts as never,
    query: { enabled: !!address && ids.length > 0 },
  });
  const batchResults =
    batchRaw as readonly { status: "success" | "failure"; result?: unknown }[] | undefined;

  const dives = useMemo<NormalizedDive[]>(() => {
    if (demo) return DEMO_DIVES;
    if (!batchResults) return [];
    const chunkCount = Math.ceil(ids.length / CHUNK_SIZE);
    const list: DiveLog[] = [];
    for (let c = 0; c < chunkCount; c++) {
      const r = batchResults[c];
      if (r?.status === "success" && Array.isArray(r.result)) {
        list.push(...(r.result as unknown[]).map(normalizeDive));
      }
    }
    const voidBase = chunkCount;
    const attBase = chunkCount + ids.length;
    return list.map((d, i) => {
      const v = batchResults[voidBase + i];
      const a = batchResults[attBase + i];
      return {
        ...d,
        voidInfo: v?.status === "success" ? (v.result as VoidInfo) : undefined,
        attestations: a?.status === "success" && Array.isArray(a.result) ? (a.result as Attestation[]) : [],
      };
    });
  }, [demo, batchResults, ids.length]);

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
