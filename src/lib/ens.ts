import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";

/**
 * ENS integration for ERC-8260 logbooks.
 *
 * Convention (proposed for the ERC's discovery appendix): an ENS name may set
 * the text record `erc8260` to an EIP-3770-style chain-prefixed logbook
 * address, e.g. `avax:0xabc…` (Avalanche C-Chain) or `fuji:0xabc…`.
 * A bare `0x…` address defaults to Avalanche C-Chain (43114).
 */
export const ENS_LOGBOOK_KEY = "erc8260";

const CHAIN_PREFIXES: Record<string, number> = {
  avax: 43114,
  fuji: 43113,
};

const client = createPublicClient({
  chain: mainnet,
  transport: http(import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com"),
});

export interface EnsLogbook {
  name: string;
  logbook: `0x${string}`;
  chainId: number;
}

export function parseLogbookRecord(value: string): { logbook: `0x${string}`; chainId: number } | null {
  const raw = value.trim();
  const match = raw.match(/^([a-z]+):(.+)$/i);
  if (match) {
    const prefix = match[1].toLowerCase();
    const addr = match[2].trim();
    const chainId = CHAIN_PREFIXES[prefix];
    if (chainId && isAddress(addr)) return { logbook: addr as `0x${string}`, chainId };
    return null;
  }
  if (isAddress(raw)) return { logbook: raw as `0x${string}`, chainId: 43114 };
  return null;
}

export async function resolveEnsLogbook(name: string): Promise<EnsLogbook | null> {
  if (!name.includes(".")) return null;
  try {
    const value = await client.getEnsText({ name, key: ENS_LOGBOOK_KEY });
    if (!value) return null;
    const parsed = parseLogbookRecord(value);
    return parsed ? { name, ...parsed } : null;
  } catch {
    return null;
  }
}

export function isEnsName(ref: string): boolean {
  return /^[\w-]+(\.[\w-]+)*\.eth$/i.test(ref.trim());
}

export function isAddressRef(ref: string): boolean {
  return ref.startsWith("0x") && ref.length === 42 && isAddress(ref);
}
