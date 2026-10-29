# DiveChain

[![CI](https://github.com/BradMyrick/divechain-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/BradMyrick/divechain-pro/actions/workflows/ci.yml)

> Your dive log. Not theirs.

**DiveChain** is a sovereign, on-chain scuba dive logbook. Each diver deploys
their own personal logbook contract on the [Avalanche C-Chain](https://www.avax.network/)
and owns it outright - no dive-computer vendor, app, or subscription can lock, alter,
or revoke their dive history. Every entry is permanent, portable, and cryptographically
verifiable.

This repository contains the **DiveChain web application** (the dApp you use in the
browser) plus the **ERC-8260 contracts**: each diver's sovereign `SovereignDiveLog`
logbook and the `DiveLogFactory` registry that maps wallets to logbooks on-chain.

**Live site:** [divechain.pro](https://divechain.pro) · **ERC-8260:** [EIP PR #1735](https://github.com/ethereum/ERCs/pull/1735)

**Status:** Live on Avalanche C-Chain. Not yet third-party audited.

---

## Why

Dive history today is fragile:

- **Vendor lock-in.** Shearwater, Garmin, and Suunto store your dives in proprietary
  formats. Switch brands or let the app die and your history stays behind.
- **Paper rots.** Water, fire, moves, or just time destroy physical logbooks.
- **No proof.** Anyone can fake a paper page or screenshot an app. Employers,
  instructors, and buddies can't independently verify experience.

DiveChain fixes all three by writing dives to a contract **you** control on a
public, censorship-resistant chain.

## How it works

1. **Get a wallet** (Core, MetaMask, Rabby). Your wallet is the only key to your logbook.
2. **Add a little AVAX** to cover gas (about 0.005 AVAX to claim, about 0.001 AVAX
   per dive; measured Oct 2026).
3. **Claim your logbook** - one transaction deploys a fresh `SovereignDiveLog` contract
   owned by your wallet. The `DiveLogFactory` registry records the wallet -> logbook
   mapping on-chain, so any device, browser, or wallet can rediscover your logbook -
   no manual re-binding, ever. No admin key, no backdoor.
4. **Log dives** - depth, time, gas, environment. Your buddy signs an **EIP-712 typed-data
   attestation** vouching the dive happened, bound to your logbook and dive number.

Each diver gets their **own** contract address. Nothing about you is stored except what
the standard requires - no name, birth date, certification number, or biometrics. Your
wallet address is your identity.

## What makes it sovereign

| Pillar | Detail |
| --- | --- |
| **Permanent & immutable** | A logged dive can never be altered or deleted. Mistakes can be *voided*, but the original record stays - an honest, auditable trail. |
| **Cryptographically verifiable** | Buddy attestations are replay-proof and independently verifiable by anyone, no login required. |
| **Zero personal data on-chain** | ERC-8260 is privacy-preserving by design. Pseudonymous, like a username only you control. |
| **Portable across apps** | Any software that speaks ERC-8260 can read your dives. Switch apps without losing data. |
| **No gatekeeper** | No company holds a master key. No subscription can revoke access. You deploy it, you own it. |
| **Sub-second finality** | Avalanche C-Chain confirms in under a second for fractions of a cent - practical between surface intervals. |

## ERC-8260 - the Sovereign Dive Log standard

DiveChain is the reference implementation of **ERC-8260**, an open dive-log
interface (`IDiveLog`, ERC-165 id `0x321ef561`) defining a rich, normalized dive
record: units system, dive mode (SSA/SCUBA), breathing gas, purpose, suit and bottom
type, decompression, and EIP-712 buddy attestations.

- **Contracts, tests & deployment scripts:** see [`deployment/`](./deployment/README.md).
  `SovereignDiveLog.sol` is the ERC reference implementation (plus a pending upstream
  hardening patch: EIP-2 canonical signatures, bounded batches, non-zero dates - see
  [SECURITY.md](./SECURITY.md)). `DiveLogFactory.sol` is the wallet -> logbook registry.
- Divers deploy their **own** `SovereignDiveLog` through the factory, so every diver owns
  a separate, sovereign logbook that any ERC-8260 client can discover on-chain.

## App overview

The dApp is a React single-page application with wallet connection (RainbowKit / wagmi),
on-chain read/write (viem), a 3D dive-site globe (react-globe.gl), dive analytics, QR buddy
attestations, public diver profiles, PDF paperwork exports, and a wallet-free demo mode.
The dive tools are pure client-side math from public-domain sources (U.S. Navy / NOAA
no-decompression tables, NOAA oxygen limits, DAN flying guidance) — no accounts, no
data leaves the browser.

| Route | Purpose |
| --- | --- |
| `/` | Landing page - flags, why, how to start |
| `/demo` | Explore a live logbook - read-only, no wallet |
| `/deploy` | Claim your logbook (one click via the factory) |
| `/logbook` | Your on-chain dive log |
| `/logbook/:id` | Dive detail: profile sketch, telemetry, QR attest |
| `/log-dive` | Record a new dive (see its flag before you submit) |
| `/import` | Batch import dives from JSON — parse, prune duplicates, review, sign in chunks |
| `/attest` | Sign / relay a buddy attestation (incl. QR signature handoff) |
| `/diver/:address` or `/diver/name.eth` | Public diver profile - verification, QR, PDF exports |
| `/dive-sites` | Dive-site explorer — 120+ curated sites (Caribbean-heavy) with live NOAA marine conditions |
| `/tools` | Dive-planning toolkit: NOAA NDL tables, rock-bottom gas, O₂ clock, weight, no-fly |
| `/community` | Community / explorer |

Every dive entry carries its flag: **Diver Down** (red) for recreational dives,
**Alpha** (blue/white swallowtail) for commercial / surface-supplied work. Two
flags, one logbook.

## Batch import — the Divechain Batch JSON standard

`/import` (linked from your Logbook) ingests dive history and logs it on-chain
in batches: upload or paste JSON, review every parsed entry in a table,
edit or remove anything, then sign. Dives already on-chain are detected and
skipped (matched by day + bottom time + max depth), the plan is chunked at the
measured 8 dives per transaction, and the pre-flight panel shows exactly how
many transactions you will sign and what they cost before MetaMask opens.
Parsing happens entirely in your browser; drafts persist locally until the
import completes.

The importer auto-detects three shapes:

1. **Divechain Batch JSON** — the standard below; also what the Logbook's
   *Download JSON* button exports, so files round-trip.
2. **Commercial repair logs** — `commercial_dive_logs` files, mapped with
   UTC times, Imperial units, and keyword-derived purposes.
3. **Generic JSON, best effort** — common aliases (`dive_date`, `max_depth`,
   `duration`, `site`…); anything it cannot map confidently is flagged for
   you to complete by hand. Nothing is guessed silently.

```json
[
  {
    "date": "2026-07-04",              // required, YYYY-MM-DD
    "units": "imperial",               // imperial | metric (depths follow it)
    "mode": "scuba",                   // ssa | scuba
    "purpose": "recreational",         // training, inspection, repair, search,
                                       // salvage, recovery, construction,
                                       // research, eod, security,
                                       // photographic, other
    "suit": "wet",                     // wet | dry | hot-water | swim
    "maxDepth": 58,                    // required
    "averageDepth": 32,                // optional, defaults to maxDepth
    "bottomTimeMinutes": 41,           // required
    "times": {                         // optional; "HH:mm" is UTC on the dive
      "leftSurface": "09:20",          // date; full ISO-8601 also accepted
      "leftBottom": "09:48",
      "reachedSurface": "10:01"
    },
    "gas": { "type": "nitrox", "o2Percent": 32 },
    "deco": { "type": "standard", "totalMinutes": 6, "tableSchedule": "60/120" },
    "environment": {
      "location": "Buccoo Reef, Tobago",
      "latitude": 11.212,
      "longitude": -60.935,
      "waterTemp": 82,
      "bottomType": "coral"
    },
    "surfaceIntervalMinutes": 1290,
    "remarks": "Turtle at the coral head"
  }
]
```

Enum names, never numbers. Every field except `date`, `maxDepth`, and
`bottomTimeMinutes` is optional. Dates are stored at noon UTC so they read as
the same calendar day in every timezone. Dive-computer export parsers (UDDF,
Shearwater, Suunto) are on the roadmap — see [BACKLOG.md](./BACKLOG.md).

## Tech stack

- **React 19** + **TypeScript**, bundled with **Vite 8**
- **wagmi** + **viem** for Ethereum/Avalanche interaction
- **RainbowKit** for wallet connection (graceful fallback without a project id)
- **Tailwind CSS v4** for styling; self-hosted Barlow Condensed / Inter / JetBrains Mono
- **react-globe.gl** (three.js) for the 3D dive-site globe — NASA Blue Marble texture
  self-hosted (`public/globe/`), lazy-loaded so it never touches first paint
- **jspdf** (lazy-loaded) for paperwork exports; **qrcode** for attest/profile QR
- **vitest** unit + cross-chain tests; headless-browser smoke checks
- `indexer/` - self-verifying viem event indexer (see [indexer/README.md](./indexer/README.md))

## Repository contents

```
.
├── src/            # DiveChain dApp (React + TypeScript + Vite)
│   ├── config/     # wagmi/RainbowKit config
│   ├── contracts/  # compiled artifacts (abi + bytecode), regenerated by deployment/export-artifacts.sh
│   ├── contexts/   # factory-backed logbook context provider
│   ├── data/       # curated dive sites & shops (the /dive-sites catalog)
│   ├── demo/       # synthetic demo logbook fixtures
│   ├── fixtures/   # forge-generated EIP-712 fixture (cross-check test)
│   ├── hooks/      # useDiveLog, batched useLogbookData
│   ├── lib/        # contract bindings, stats, ENS, attestations, PDF export, dive-planning math
│   └── pages/      # route components
├── api/            # Vercel serverless functions (NOAA conditions, NHC tropical outlook)
├── deployment/     # Foundry project - ERC-8260 contracts, tests & deploy scripts
├── indexer/        # self-verifying event indexer (anvil harness included)
├── scripts/        # headless smoke checks
└── SECURITY.md     # security & scaling review, trade-offs, test coverage
```

## Local development

> The code is published here for transparency and review. DiveChain is a product,
> not a community open-source project - there is no contribution workflow.

```bash
npm install
cp .env.example .env.local     # set VITE_WALLETCONNECT_PROJECT_ID (optional: desktop wallets work without it)
npm run dev
```

Build, test, and check:

```bash
npm run build
npm test          # unit + EIP-712 cross-check vs the contract
npm run smoke     # headless-browser render check (needs vite preview/dev running)
```

Contracts and tests: see [`deployment/README.md`](./deployment/README.md) (`forge test`).

The only client environment variable is `VITE_WALLETCONNECT_PROJECT_ID`, a **public**
WalletConnect Cloud project id (it ships in the browser bundle by design - it is not a
secret). Create one at [cloud.reown.com](https://cloud.reown.com).

## Networks

| Network | Chain ID | Status |
| --- | --- | --- |
| Avalanche C-Chain | 43114 | Production |
| Avalanche Fuji | 43113 | Testnet |

## Dive-site conditions

`/dive-sites` pairs a curated site catalog (`src/data/`) with live public-domain data.
No API keys, no third-party accounts — everything comes from U.S. government sources:

- **Marine forecasts** — NWS Coastal Waters Forecast text products (`api.weather.gov`),
  resolved per-site to the covering marine zone, parsed into forecast periods
- **Buoy observations** — NDBC real-time stations (waves, swell period, wind, water temp)
- **Tide predictions** — NOAA CO-OPS (36-hour curve, next high/low)
- **Tropical weather** — NHC Atlantic outlook banner on Caribbean sites
- **Sun times** — NOAA solar equations, computed client-side

US-water sites get the full live stack. Non-US sites show curated climatology plus a link
to the official national meteorological service, by design — the data is public domain
or it is not shipped.

The conditions stack runs as Vercel serverless functions in [`api/`](./api) with a
20-minute cache; the provider layer is isolated so a commercial source can slot in later.

The `DiveLogFactory` is deployed once per network (see
[`deployment/README.md`](./deployment/README.md) for current addresses).

## Source & deployments

This repository is the complete product: dApp, contracts, tests, indexer. The
`DiveLogFactory` contracts below were deployed from this exact source tree and
verified **byte-identical** to this repository's compilation (direct
`eth_getCode` comparison — see [`deployment/README.md`](./deployment/README.md)):

| Network | Chain ID | DiveLogFactory |
| --- | --- | --- |
| Avalanche C-Chain | 43114 | `0x3894070DDdA804f9ba96116c9bd810eF745f5999` |
| Avalanche Fuji | 43113 | `0x921dc74BA049748BdFeE471F641f48688aDF8b49` |

What you deploy is what you read — no unaudited bytecode in between.

## License

App code is MIT (see [`LICENSE`](./LICENSE)). Contracts and reference files in
[`deployment/`](./deployment/) are CC0-1.0 (see [`deployment/LICENSE`](./deployment/LICENSE)),
so anyone can implement ERC-8260 freely.
