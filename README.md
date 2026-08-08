# Divechain Pro

> Your dive log. Not theirs.

**Divechain Pro** is a sovereign, on-chain scuba dive logbook. Each diver deploys
their own personal logbook contract on the [Avalanche C-Chain](https://www.avax.network/)
and owns it outright - no dive-computer vendor, app, or subscription can lock, alter,
or revoke their dive history. Every entry is permanent, portable, and cryptographically
verifiable.

This repository contains the **Divechain Pro web application** (the dApp you use in the
browser) plus the **ERC-8260 reference contract** used to deploy each diver's sovereign
logbook.

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
2. **Add a few cents of AVAX** to cover gas (~$0.30–0.80 to deploy, a fraction of a cent
   per dive).
3. **Claim your logbook** - one transaction deploys a fresh `SovereignDiveLog` contract
   owned by your wallet. No admin key, no backdoor.
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

- **Reference contract & deployment scripts:** see [`deployment/`](./deployment/README.md)
  (`SovereignDiveLog.sol` is the verbatim ERC reference implementation).
- Each dApp wallet deploys its **own** `SovereignDiveLog` instance from the browser, so
  every diver owns a separate, sovereign logbook contract.

## App overview

The dApp is a React single-page application with wallet connection (RainbowKit / wagmi),
on-chain read/write (viem / ethers), a dive-site map (react-leaflet), and dive analytics
(recharts).

| Route | Purpose |
| --- | --- |
| `/` | Landing page - what it is, why it matters, how to start |
| `/deploy` | Claim your sovereign logbook (deploy `SovereignDiveLog`) |
| `/logbook` | Your on-chain dive log |
| `/logbook/:id` | Dive detail with buddy attestations |
| `/log-dive` | Record a new dive |
| `/attest` | Sign a buddy attestation for another diver |
| `/dive-sites` | Dive-site map |
| `/tools` | Dive calculators and tools |
| `/community` | Community / explorer |

## Tech stack

- **React 19** + **TypeScript**, bundled with **Vite 8**
- **wagmi** + **viem** for Ethereum/Avalanche interaction
- **RainbowKit** for wallet connection
- **Tailwind CSS v4** for styling
- **react-leaflet** for maps, **recharts** for analytics

## Repository contents

```
.
├── src/            # Divechain Pro dApp (React + TypeScript + Vite)
│   ├── config/     # wagmi/RainbowKit config
│   ├── contracts/  # compiled ERC-8260 artifact (abi + bytecode)
│   ├── contexts/   # DiveContract context provider
│   ├── hooks/      # useDiveLog, useLocalStorage
│   ├── lib/        # contract bindings, ERC-8260 enums & labels
│   └── pages/      # route components
└── deployment/     # Foundry project - ERC-8260 reference contract & deploy scripts
```

## Local development

> The code is published here for transparency and review. Divechain Pro is a product,
> not a community open-source project - there is no contribution workflow.

```bash
npm install
cp .env.example .env.local     # set VITE_WALLETCONNECT_PROJECT_ID
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

The only client environment variable is `VITE_WALLETCONNECT_PROJECT_ID`, a **public**
WalletConnect Cloud project id (it ships in the browser bundle by design - it is not a
secret). Create one at [cloud.reown.com](https://cloud.reown.com).

## Networks

| Network | Chain ID | Status |
| --- | --- | --- |
| Avalanche C-Chain | 43114 | Production |
| Avalanche Fuji | 43113 | Testnet |

## License

Source published for review. **All rights reserved.** See the deployable ERC-8260
reference contract under [`deployment/`](./deployment/README.md).
