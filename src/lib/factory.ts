import DiveLogFactoryArtifact from "../contracts/DiveLogFactory.json";

export const DIVE_LOG_FACTORY_ABI = DiveLogFactoryArtifact.abi;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Per-chain DiveLogFactory deployments. The factory maps wallet → logbook
 * on-chain, replacing localStorage binding.
 *
 * These are compile-time constants ON PURPOSE, not env vars: contract
 * addresses are public immutable facts (no confidentiality), and keeping them
 * in reviewed, CI-tested code means the logbook-resolution path can only
 * change via commit — never via a mutable deployment variable. Changing a
 * deployment = code change + full verification (see deployment/README.md).
 *
 * Both live deployments verified byte-identical to this repo's compilation
 * (solc 0.8.34 / cancun / optimizer 200) — see deployment/foundry.toml.
 * Anvil: the first default-foundry deployer account address (nonce 0).
 */
export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  43113: "0x921dc74BA049748BdFeE471F641f48688aDF8b49",
  43114: "0x3894070DDdA804f9ba96116c9bd810eF745f5999",
};

export function factoryAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) return undefined;
  const addr = FACTORY_ADDRESSES[chainId];
  if (!addr || addr === ZERO_ADDRESS) return undefined;
  return addr;
}

/** Legacy localStorage registry written by pre-factory versions of the dApp. */
export const LEGACY_REGISTRY_KEY = "divechain_contracts_v2";

/** Cache of factory-resolved logbooks, for instant load before the RPC answers. */
export const FACTORY_CACHE_KEY = "divechain_factory_cache_v1";

export function readLegacyBinding(wallet: string, chainId: number): `0x${string}` | undefined {
  try {
    const raw = window.localStorage.getItem(LEGACY_REGISTRY_KEY);
    if (!raw) return undefined;
    const registry = JSON.parse(raw) as Record<string, string>;
    const addr = registry[`${wallet}:${chainId}`];
    return addr && addr.startsWith("0x") && addr.length === 42
      ? (addr as `0x${string}`)
      : undefined;
  } catch {
    return undefined;
  }
}

export function readCachedLogbook(wallet: string, chainId: number): `0x${string}` | undefined {
  try {
    const raw = window.localStorage.getItem(FACTORY_CACHE_KEY);
    if (!raw) return undefined;
    const registry = JSON.parse(raw) as Record<string, string>;
    const addr = registry[`${chainId}:${wallet}`];
    return addr && addr.startsWith("0x") && addr.length === 42
      ? (addr as `0x${string}`)
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeCachedLogbook(
  wallet: string,
  chainId: number,
  logbook: `0x${string}`,
): void {
  try {
    const raw = window.localStorage.getItem(FACTORY_CACHE_KEY);
    const registry = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    registry[`${chainId}:${wallet}`] = logbook;
    window.localStorage.setItem(FACTORY_CACHE_KEY, JSON.stringify(registry));
  } catch {
    /* localStorage unavailable — cache is best-effort only */
  }
}

export function clearCachedLogbook(wallet: string, chainId: number): void {
  try {
    const raw = window.localStorage.getItem(FACTORY_CACHE_KEY);
    if (!raw) return;
    const registry = JSON.parse(raw) as Record<string, string>;
    delete registry[`${chainId}:${wallet}`];
    window.localStorage.setItem(FACTORY_CACHE_KEY, JSON.stringify(registry));
  } catch {
    /* ignore */
  }
}
