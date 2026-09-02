# Divechain Indexer

Lightweight event indexer for the DiveLogFactory + ERC-8260 logbook ecosystem.
Polls `Logbook*` registry events and per-logbook `Dive*` events, aggregates
them, and writes a small JSON snapshot (`out/data.json`) suitable for serving
the Community/Explore pages and global stats — no external indexing service
required.

## Why a poller (for now)

Zero framework lock-in, fully self-verifiable offline (`verify:anvil` boots a
local foundry chain, exercises the whole flow, and asserts the output). When
the ecosystem outgrows polling (tens of thousands of logbooks, sub-second
freshness), graduate to Ponder or a subgraph — the event contract surface is
identical, so the migration is config, not redesign.

## Run

```bash
cd indexer
npm install

# point at deployed factories (chain without a factory is skipped)
export FUJI_FACTORY_ADDRESS=0x…
export AVAX_FACTORY_ADDRESS=0x…

# one pass
INDEX_ONCE=1 npm start

# poll loop (default 60s)
npm start
```

Output shape (`out/data.json`):

```json
{
  "updatedAt": 0,
  "chains": {
    "fuji": { "factory": "0x…", "logbooks": [ { "owner": "0x…", "logbook": "0x…", "dives": 12, "attestations": 9, "voided": 1, "registeredVia": "created" } ] }
  },
  "global": { "divers": 1, "logbooks": 1, "dives": 12, "attestations": 9 }
}
```

## Self-verification

```bash
npm run verify:anvil
```

Boots `anvil`, deploys the factory, claims two logbooks, logs a dive, signs +
relays an EIP-712 attestation, releases one logbook, runs an indexing pass and
asserts every field. Exits non-zero on any mismatch — usable directly in CI.

## Hosting notes

- Any Node 22 runtime (systemd timer, cron, Cloudflare Worker with nodejs_compat,
  Fly machine) works; the only state is the JSON file.
- Fail-closed: if an RPC errors mid-pass, the previous `data.json` is kept
  rather than writing partial data as authoritative.
