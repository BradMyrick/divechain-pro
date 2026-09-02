# Divechain Pro

> Your dive log. Not theirs.

**Divechain Pro** is a sovereign, on-chain scuba dive logbook. Each diver deploys
their own personal logbook contract on the [Avalanche C-Chain](https://www.avax.network/)
and owns it outright - no dive-computer vendor, app, or subscription can lock, alter,
or revoke their dive history. Every entry is permanent, portable, and cryptographically
verifiable.

This repository contains the **Divechain Pro web application** (the dApp you use in the
browser) plus the **ERC-8260 contracts**: each diver's sovereign `SovereignDiveLog`
logbook and the `DiveLogFactory` registry that maps wallets to logbooks on-chain.

**Live site:** [divechain.pro](https://divechain.pro)

---

## Why

Dive history today is fragile:

- **Vendor lock-in.** Shearwater, Garmin, and Suunto store your dives in proprietary
  formats. Switch brands or let the app die and your history stays behind.
- **Paper rots.** Water, fire, moves, or just time destroy physical logbooks.
- **No proof.** Anyone can fake a paper page or screenshot an app. Employers,
  instructors, and buddies can't independently verify experience.

Divechain Pro fixes all three by writing dives to a contract **you** control on a
public, censorship-resistant chain.

## How it works

1. **Get a wallet** (Core, MetaMask, Rabby). Your wallet is the only key to your logbook.
2. **Add a few cents of AVAX** to cover gas (~$0.10–0.50 to claim, a fraction of a cent
   per dive).
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

Divechain Pro is the reference implementation of **ERC-8260**, an open dive-log
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
on-chain read/write (viem), a dive-site map (react-leaflet), dive analytics, QR buddy
attestations, public diver profiles, PDF paperwork exports, and a wallet-free demo mode.

| Route | Purpose |
| --- | --- |
| `/` | Landing page - flags, why, how to start |
| `/demo` | Explore a live logbook - read-only, no wallet |
| `/deploy` | Claim your logbook (one click via the factory) |
| `/logbook` | Your on-chain dive log |
| `/logbook/:id` | Dive detail: profile sketch, telemetry, QR attest |
| `/log-dive` | Record a new dive (see its flag before you submit) |
| `/attest` | Sign / relay a buddy attestation (incl. QR signature handoff) |
| `/diver/:address` or `/diver/name.eth` | Public diver profile - verification, QR, PDF exports |
| `/dive-sites` | Dive-site map |
| `/tools` | Dive calculators and tools |
| `/community` | Community / explorer |

Every dive entry carries its flag: **Diver Down** (red) for recreational dives,
**Alpha** (blue/white swallowtail) for commercial / surface-supplied work. Two
flags, one logbook.

## Tech stack

- **React 19** + **TypeScript**, bundled with **Vite 8**
- **wagmi** + **viem** for Ethereum/Avalanche interaction
- **RainbowKit** for wallet connection (graceful fallback without a project id)
- **Tailwind CSS v4** for styling; self-hosted Barlow Condensed / Inter / JetBrains Mono
- **react-leaflet** for maps; hand-rolled SVG dive profiles
- **jspdf** (lazy-loaded) for paperwork exports; **qrcode** for attest/profile QR
- **vitest** unit + cross-chain tests; headless-browser smoke checks
- `indexer/` - self-verifying viem event indexer (see [indexer/README.md](./indexer/README.md))

## Repository contents

```
.
├── src/            # Divechain Pro dApp (React + TypeScript + Vite)
│   ├── config/     # wagmi/RainbowKit config
│   ├── contracts/  # compiled artifacts (abi + bytecode), regenerated by deployment/export-artifacts.sh
│   ├── contexts/   # factory-backed logbook context provider
│   ├── demo/       # synthetic demo logbook fixtures
│   ├── fixtures/   # forge-generated EIP-712 fixture (cross-check test)
│   ├── hooks/      # useDiveLog, batched useLogbookData
│   ├── lib/        # contract bindings, stats, ENS, attestations, PDF export
│   └── pages/      # route components
├── deployment/     # Foundry project - ERC-8260 contracts, tests & deploy scripts
├── indexer/        # self-verifying event indexer (anvil harness included)
├── scripts/        # headless smoke checks
└── SECURITY.md     # security & scaling review, trade-offs, test coverage
```

## Local development

> The code is published here for transparency and review. Divechain Pro is a product,
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

**MIT** for this application, the indexer, and tooling — see [LICENSE](./LICENSE).
The ERC-8260 reference contracts under [`deployment/`](./deployment/README.md)
are **CC0-1.0** (public domain), as the standard requires.
