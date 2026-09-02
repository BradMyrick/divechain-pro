import { keccak256, toHex } from "viem";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CHAINS, clientFor, logAbi, logEvent } from "./config.js";

const here = dirname(fileURLToPath(import.meta.url));

const TOPIC = {
  created: keccak256(toHex("LogbookCreated(address,address)")),
  adopted: keccak256(toHex("LogbookAdopted(address,address)")),
  released: keccak256(toHex("LogbookReleased(address,address)")),
};

const topicToAddress = (t) => "0x" + t.slice(-40);

/**
 * Index one chain from the factory's Logbook* events, then aggregate each
 * registered logbook's activity from its Dive* events.
 * Fail-closed: on RPC error the chain returns null and keeps prior output.
 */
export async function indexChain(key) {
  const cfg = CHAINS[key];
  if (!cfg.factory) return { factory: undefined, logbooks: [] };
  const client = clientFor(key);

  const latest = await client.getBlockNumber();
  const registryLogs = await client.getLogs({
    address: cfg.factory,
    fromBlock: cfg.startBlock,
    toBlock: latest,
  });

  const registry = new Map(); // owner -> { logbook, via }
  for (const log of registryLogs) {
    if (log.topics[0] === TOPIC.created) {
      registry.set(topicToAddress(log.topics[1]), {
        logbook: topicToAddress(log.topics[2]),
        via: "created",
      });
    } else if (log.topics[0] === TOPIC.adopted) {
      registry.set(topicToAddress(log.topics[1]), {
        logbook: topicToAddress(log.topics[2]),
        via: "adopted",
      });
    } else if (log.topics[0] === TOPIC.released) {
      registry.delete(topicToAddress(log.topics[1]));
    }
  }

  const diveLogged = logEvent("DiveLogged");
  const diveAttested = logEvent("DiveAttested");
  const diveVoided = logEvent("DiveVoided");

  const logbooks = [];
  for (const [owner, { logbook, via }] of registry) {
    try {
      const [diveCount, diveLogs, attLogs, voidLogs] = await Promise.all([
        client.readContract({ address: logbook, abi: logAbi, functionName: "diveCount" }),
        client.getLogs({ address: logbook, event: diveLogged, fromBlock: cfg.startBlock, toBlock: latest }),
        client.getLogs({ address: logbook, event: diveAttested, fromBlock: cfg.startBlock, toBlock: latest }),
        client.getLogs({ address: logbook, event: diveVoided, fromBlock: cfg.startBlock, toBlock: latest }),
      ]);
      const dates = diveLogs.map((l) => Number(l.args.diveDate)).filter((d) => d > 0).sort((a, b) => a - b);
      logbooks.push({
        chain: key,
        logbook,
        owner,
        registeredVia: via,
        dives: Number(diveCount),
        attestations: attLogs.length,
        voided: voidLogs.length,
        firstDiveDate: dates[0],
        latestDiveDate: dates[dates.length - 1],
      });
    } catch (err) {
      console.warn(`[indexer] skipping logbook ${logbook}: ${err.message}`);
    }
  }

  return { factory: cfg.factory, logbooks };
}

/** Run one pass over every configured chain and write out/data.json atomically. */
export async function runOnce({ outPath } = {}) {
  const chains = {};
  let global = { divers: 0, logbooks: 0, dives: 0, attestations: 0 };

  for (const key of Object.keys(CHAINS)) {
    const cfg = CHAINS[key];
    if (!cfg.factory) {
      chains[key] = { factory: undefined, logbooks: [] };
      continue;
    }
    try {
      const result = await indexChain(key);
      chains[key] = result;
      global.logbooks += result.logbooks.length;
      global.divers += new Set(result.logbooks.map((l) => l.owner)).size;
      global.dives += result.logbooks.reduce((a, l) => a + l.dives, 0);
      global.attestations += result.logbooks.reduce((a, l) => a + l.attestations, 0);
    } catch (err) {
      console.warn(`[indexer] chain ${key} unavailable, keeping previous data: ${err.message}`);
      return null;
    }
  }

  const output = { updatedAt: Date.now(), chains, global };
  const dest = outPath ?? join(here, "../out/data.json");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(output, null, 2));
  return output;
}

const isMain = process.argv[1] && process.argv[1].endsWith("index.js");
if (isMain) {
  const intervalMs = Number(process.env.INDEX_INTERVAL_MS ?? 60_000);
  console.log(`[indexer] starting (interval ${intervalMs}ms)`);
  await runOnce();
  if (process.env.INDEX_ONCE !== "1") {
    setInterval(() => {
      runOnce().catch((e) => console.warn(`[indexer] pass failed: ${e.message}`));
    }, intervalMs);
  }
}
