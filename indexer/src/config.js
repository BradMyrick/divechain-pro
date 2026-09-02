import { createPublicClient, http } from "viem";
import { avalancheFuji, avalanche, foundry } from "viem/chains";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const factoryAbi = JSON.parse(
  readFileSync(join(here, "../../src/contracts/DiveLogFactory.json"), "utf8"),
).abi;
export const logAbi = JSON.parse(
  readFileSync(join(here, "../../src/contracts/SovereignDiveLog.json"), "utf8"),
).abi;

export const CHAINS = {
  fuji: {
    chain: avalancheFuji,
    rpc: process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc",
    factory: process.env.FUJI_FACTORY_ADDRESS,
    startBlock: BigInt(process.env.FUJI_START_BLOCK ?? 0),
  },
  avax: {
    chain: avalanche,
    rpc: process.env.AVAX_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc",
    factory: process.env.AVAX_FACTORY_ADDRESS,
    startBlock: BigInt(process.env.AVAX_START_BLOCK ?? 0),
  },
  anvil: {
    chain: foundry,
    rpc: process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545",
    factory: process.env.ANVIL_FACTORY_ADDRESS,
    startBlock: 0n,
  },
};

export function clientFor(key) {
  const cfg = CHAINS[key];
  if (!cfg) throw new Error(`unknown chain key: ${key}`);
  return createPublicClient({ chain: cfg.chain, transport: http(cfg.rpc) });
}

export function logEvent(name) {
  const item = logAbi.find((e) => e.type === "event" && e.name === name);
  if (!item) throw new Error(`event ${name} missing from SovereignDiveLog ABI`);
  return { type: "event", name: item.name, inputs: item.inputs };
}
