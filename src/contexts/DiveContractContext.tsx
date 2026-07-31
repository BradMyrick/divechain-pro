import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAccount } from "wagmi";

const STORAGE_KEY = "divechain_contracts_v2";
const OLD_KEY = "divechain_contracts";
const LEGACY_KEY = "divechain_contract";

type ContractRegistry = Record<string, string>;

interface DiveContractState {
  contractAddress: `0x${string}` | undefined;
  hasContract: boolean;
  setContract: (addr: string) => void;
  clearContract: () => void;
  walletKey: string;
  chainId: number | undefined;
}

const DiveContractContext = createContext<DiveContractState>({
  contractAddress: undefined,
  hasContract: false,
  setContract: () => {},
  clearContract: () => {},
  walletKey: "",
  chainId: undefined,
});

function loadRegistry(): ContractRegistry {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContractRegistry) : {};
  } catch {
    return {};
  }
}

function saveRegistry(registry: ContractRegistry) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}

function scopeKey(walletKey: string, chainId: number): string {
  return `${walletKey}:${chainId}`;
}

function migrateOldFormat(existing: ContractRegistry): ContractRegistry {
  const registry = { ...existing };

  try {
    const old = window.localStorage.getItem(OLD_KEY);
    if (old) {
      const parsed = JSON.parse(old) as Record<string, string>;
      let migrated = false;
      for (const [walletKey, addr] of Object.entries(parsed)) {
        if (addr.startsWith("0x") && addr.length === 42) {
          const scoped = `${walletKey}:43113`;
          if (!registry[scoped]) {
            registry[scoped] = addr;
            migrated = true;
          }
        }
      }
      if (migrated) window.localStorage.removeItem(OLD_KEY);
    }
  } catch { /* ignore */ }

  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const addr = legacy.startsWith("0x") && legacy.length === 42 ? legacy : null;
      if (addr) {
        const keys = Object.keys(registry);
        const needsMigration = !keys.some((k) => registry[k] === addr);
        if (needsMigration) {
          registry[`legacy:43113`] = addr;
        }
      }
      window.localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* ignore */ }

  if (Object.keys(registry).length > 0) {
    saveRegistry(registry);
  }
  return registry;
}

export function DiveContractProvider({ children }: { children: ReactNode }) {
  const { address, chainId } = useAccount();
  const [registry, setRegistry] = useState<ContractRegistry>(() => {
    const existing = loadRegistry();
    return migrateOldFormat(existing);
  });

  const [didMigrate, setDidMigrate] = useState(false);
  if (!didMigrate && address && chainId) {
    const existing = loadRegistry();
    const updated = migrateOldFormat(existing);
    if (Object.keys(updated).length > 0) {
      saveRegistry(updated);
      setRegistry(updated);
    }
    setDidMigrate(true);
  }

  const walletKey = address ? address.toLowerCase() : "";
  const scopedKey = walletKey && chainId ? scopeKey(walletKey, chainId) : "";

  // Bind legacy contract to current wallet on Fuji (do this during render, not in effect)
  if (walletKey && chainId) {
    const scoped = scopeKey(walletKey, chainId);
    const legacyKey = `legacy:${chainId}`;
    const legacyAddr = registry[legacyKey];
    if (legacyAddr && !registry[scoped]) {
      const next = { ...registry, [scoped]: legacyAddr };
      saveRegistry(next);
      setRegistry(next);
    }
  }

  const contractAddress: string | undefined = scopedKey ? registry[scopedKey] : undefined;

  const setContract = useCallback(
    (addr: string) => {
      if (!walletKey || !chainId) return;
      const key = scopeKey(walletKey, chainId);
      setRegistry((prev) => {
        const next = { ...prev, [key]: addr };
        saveRegistry(next);
        return next;
      });
    },
    [walletKey, chainId],
  );

  const clearContract = useCallback(() => {
    if (!walletKey || !chainId) return;
    const key = scopeKey(walletKey, chainId);
    setRegistry((prev) => {
      const next = { ...prev };
      delete next[key];
      saveRegistry(next);
      return next;
    });
  }, [walletKey, chainId]);

  const hasContract = !!contractAddress;

  return (
    <DiveContractContext.Provider
      value={{
        contractAddress: (contractAddress || undefined) as `0x${string}` | undefined,
        hasContract,
        setContract,
        clearContract,
        walletKey,
        chainId,
      }}
    >
      {children}
    </DiveContractContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDiveContract() {
  return useContext(DiveContractContext);
}
