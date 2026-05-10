import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAccount } from "wagmi";

const STORAGE_KEY = "divechain_contracts";
const OLD_KEY = "divechain_contract";

type ContractRegistry = Record<string, string>;

interface DiveContractState {
  contractAddress: `0x${string}` | undefined;
  hasContract: boolean;
  setContract: (addr: string) => void;
  clearContract: () => void;
  walletKey: string;
}

const DiveContractContext = createContext<DiveContractState>({
  contractAddress: undefined,
  hasContract: false,
  setContract: () => {},
  clearContract: () => {},
  walletKey: "",
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

function getOldContract(): string | null {
  const old = window.localStorage.getItem(OLD_KEY);
  if (!old) return null;
  try {
    const parsed = JSON.parse(old);
    if (typeof parsed === "string" && parsed.startsWith("0x") && parsed.length === 42) return parsed;
  } catch {
    if (old.startsWith("0x") && old.length === 42) return old;
  }
  return null;
}

export function DiveContractProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [registry, setRegistry] = useState<ContractRegistry>(loadRegistry);

  const walletKey = address ? address.toLowerCase() : "";
  const contractAddress = (walletKey && registry[walletKey]) || "";

  if (walletKey && !registry[walletKey]) {
    const oldAddr = getOldContract();
    if (oldAddr) {
      const next = { ...registry, [walletKey]: oldAddr };
      saveRegistry(next);
      setRegistry(next);
      window.localStorage.removeItem(OLD_KEY);
    }
  }

  const setContract = useCallback(
    (addr: string) => {
      if (!walletKey) return;
      setRegistry((prev) => {
        const next = { ...prev, [walletKey]: addr };
        saveRegistry(next);
        return next;
      });
    },
    [walletKey],
  );

  const clearContract = useCallback(() => {
    if (!walletKey) return;
    setRegistry((prev) => {
      const next = { ...prev };
      delete next[walletKey];
      saveRegistry(next);
      return next;
    });
  }, [walletKey]);

  return (
    <DiveContractContext.Provider
      value={{
        contractAddress: (contractAddress || undefined) as `0x${string}` | undefined,
        hasContract: !!contractAddress,
        setContract,
        clearContract,
        walletKey,
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
