import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  DIVE_LOG_FACTORY_ABI,
  factoryAddress,
  readCachedLogbook,
  readLegacyBinding,
  writeCachedLogbook,
  clearCachedLogbook,
} from "../lib/factory";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface DiveContractState {
  /** Wallet's registered logbook on the current chain (factory-resolved). */
  contractAddress: `0x${string}` | undefined;
  hasContract: boolean;
  /** Factory lookup (or legacy fallback resolution) still in flight. */
  isResolving: boolean;
  /** A DiveLogFactory is deployed on the current chain. */
  factoryConfigured: boolean;
  /**
   * A logbook binding known locally (legacy registry or cache) that the factory
   * does not know about — offer a one-click adoptLogbook() migration.
   */
  needsAdoption: `0x${string}` | undefined;
  /** Dismiss the adoption prompt for this session. */
  dismissAdoption: () => void;
  walletKey: string;
  chainId: number | undefined;
  /** Re-run the factory lookup (after create/adopt/release transactions). */
  refresh: () => void;
}

const DiveContractContext = createContext<DiveContractState>({
  contractAddress: undefined,
  hasContract: false,
  isResolving: false,
  factoryConfigured: false,
  needsAdoption: undefined,
  dismissAdoption: () => {},
  walletKey: "",
  chainId: undefined,
  refresh: () => {},
});

export function DiveContractProvider({ children }: { children: ReactNode }) {
  const { address, chainId } = useAccount();
  const walletKey = address ? address.toLowerCase() : "";

  const factory = factoryAddress(chainId);
  const factoryConfigured = !!factory;

  const {
    data: logbookData,
    isLoading,
    refetch,
  } = useReadContract({
    address: factory,
    abi: DIVE_LOG_FACTORY_ABI,
    functionName: "logbookOf",
    args: [address],
    query: { enabled: !!factory && !!address },
  });

  // Effects only — no setState during render.
  const factoryLogbook =
    logbookData && logbookData !== ZERO_ADDRESS ? (logbookData as `0x${string}`) : undefined;

  useEffect(() => {
    if (factoryConfigured && address && chainId && factoryLogbook) {
      writeCachedLogbook(address.toLowerCase(), chainId, factoryLogbook);
    }
  }, [factoryConfigured, address, chainId, factoryLogbook]);

  const legacyBinding =
    address && chainId ? readCachedLogbook(address.toLowerCase(), chainId) : undefined;

  const isResolving = factoryConfigured ? isLoading : false;

  const contractAddress = useMemo(() => {
    if (!address || !chainId) return undefined;
    if (factoryConfigured) {
      // Cache is an instant-load hint only; the factory answer is authoritative
      // (undefined while loading on first visit, then settles).
      if (isLoading) return legacyBinding;
      return factoryLogbook;
    }
    // No factory on this chain yet: preserve the pre-factory localStorage flow.
    return readLegacyBinding(address.toLowerCase(), chainId);
  }, [address, chainId, factoryConfigured, isLoading, factoryLogbook, legacyBinding]);

  const needsAdoption = useMemo(() => {
    if (!factoryConfigured || isResolving || !address || !chainId) return undefined;
    if (factoryLogbook) return undefined;
    return legacyBinding ?? readLegacyBinding(address.toLowerCase(), chainId);
  }, [factoryConfigured, isResolving, address, chainId, factoryLogbook, legacyBinding]);

  const dismissAdoption = useCallback(() => {
    if (address && chainId) clearCachedLogbook(address.toLowerCase(), chainId);
  }, [address, chainId]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<DiveContractState>(
    () => ({
      contractAddress,
      hasContract: !!contractAddress,
      isResolving,
      factoryConfigured,
      needsAdoption,
      dismissAdoption,
      walletKey,
      chainId,
      refresh,
    }),
    [
      contractAddress,
      isResolving,
      factoryConfigured,
      needsAdoption,
      dismissAdoption,
      walletKey,
      chainId,
      refresh,
    ],
  );

  return <DiveContractContext.Provider value={value}>{children}</DiveContractContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDiveContract() {
  return useContext(DiveContractContext);
}
