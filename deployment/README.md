# Divechain.pro - ERC-8260 Deployment

Foundry project for the **ERC-8260 Dive Log** contracts:

- `SovereignDiveLog` - the per-diver logbook (reference implementation of the
  ERC under review as [ethereum/ERCs#1735](https://github.com/ethereum/ERCs/pull/1735)).
- `DiveLogFactory` - the on-chain wallet -> logbook registry that replaces
  browser-localStorage binding: any client can rediscover a diver's logbook
  with a single `logbookOf(diver)` call, on any device.

## Layout

```
deployment/
├── src/
│   ├── DiveLogFactory.sol           # wallet -> logbook registry (create/adopt/release)
│   ├── SovereignDiveLog.sol         # ERC-8260 reference implementation (owner-only logbook)
│   └── interfaces/                  # verbatim ERC-8260 reference interfaces
│       ├── IDiveLogTypes.sol        # enums + structs
│       ├── IDiveLog.sol             # interface (ERC-165 id 0x321ef561)
│       ├── IDiveLogTypedData.sol    # EIP-712 typed-data hashing library
│       └── IERC165.sol
├── script/
│   ├── Deploy.s.sol                 # deploys the DiveLogFactory
│   └── EmitEip712Fixture.s.sol      # emits the TS<->Solidity EIP-712 test fixture
├── test/
│   ├── DiveLogFactory.t.sol         # unit + invariant tests for the registry
│   └── SovereignDiveLog.t.sol       # smoke tests: logging, voiding, attestations, guards
├── export-artifacts.sh              # regenerates ../src/contracts/*.json for the dApp
├── export-fixture.sh                # regenerates ../src/fixtures/eip712-fixture.json
├── flattened/DiveLogFactory.flattened.sol  # single-file source for web deployers (gitignored)
├── foundry.toml
└── out/                             # compiled artifacts (gitignored)
```

## The factory

`DiveLogFactory` is deliberately minimal: immutable, no admin functions, no
upgradeability, no funds. Every entry is keyed to `msg.sender`.

| Function | Behavior |
| --- | --- |
| `createLogbook()` | Deploys a new `SovereignDiveLog` owned by the caller and registers it. Reverts `AlreadyRegistered` if the wallet already has one. |
| `adoptLogbook(addr)` | Registers a logbook deployed before the factory existed. Verifies ERC-165 `IDiveLog` support **and** `addr.owner() == msg.sender` via bounded staticcalls (fails closed on codeless/malicious addresses). |
| `releaseLogbook()` | Clears the caller's own registry entry (e.g. to undo a bad adopt). |
| `logbookOf(diver)` | View: the registered logbook, or `address(0)`. |

Events `LogbookCreated` / `LogbookAdopted` / `LogbookReleased` make the
registry indexable by explorers without any central server.

Why full deployments instead of EIP-1167 clones: the reference implementation
stores `owner` as an **immutable**, which is embedded in contract bytecode.
Minimal proxies never run the implementation constructor, so every clone would
inherit the implementation deployer as owner. Deploying complete contracts
(~2M gas, roughly $0.10-0.50 on Avalanche) keeps every logbook byte-identical
to the canonical ERC reference and independently verifiable.

The 1:1 wallet-to-logbook mapping is also the replay protection for a future
sponsored-deployment (meta-transaction) extension: a signed
`createLogbookFor(owner)` request can never be replayed once the wallet is
registered.

## Local-reference hardening (pending upstream)

`SovereignDiveLog.sol` carries three small hardening changes on top of the
current PR #1735 sources (also applied to the ERC fork for merge):

1. **EIP-2 canonical signatures** - `_recoverSigner` rejects `s` values above
   half the secp256k1 group order (malleability hygiene).
2. **Batch bound** - `batchLogDives` reverts with `InvalidBatchSize` on empty
   batches or batches above `MAX_BATCH_SIZE` (100), preventing block-gas
   self-DoS.
3. **Date sanity** - `logDive`/`batchLogDives` revert with `InvalidDate` when
   `diveDate == 0`.

The `interfaces/` directory is byte-identical to the ERC assets (excluded from
`forge fmt` via `foundry.toml`).

## Setup

```bash
cp .env.example .env   # fill PRIVATE_KEY
source .env
forge build
forge test
```

> Compiler: solc **0.8.34**, `evm_version = cancun`, optimizer 200 runs —
> verified to reproduce the deployed factory bytecode byte-for-byte. Avalanche
> has supported Cancun since the Durango upgrade (Feb 2024). Sources remain
> `pragma ^0.8.20`, so upstream (PR #1735) is unaffected by this toolchain pin.

## Deploy the factory

```bash
# Fuji testnet (chain 43113)
forge script script/Deploy.s.sol \
  --rpc-url $FUJI_RPC_URL --broadcast --private-key $PRIVATE_KEY --slow

# Avalanche C-Chain mainnet (chain 43114)
forge script script/Deploy.s.sol \
  --rpc-url $CCHAIN_RPC_URL --broadcast --private-key $PRIVATE_KEY --slow
```

Divers never run this script: they call `factory.createLogbook()` from the
dApp (one click), or `factory.adoptLogbook(addr)` to register an older
directly-deployed logbook.

## Verify source on Snowtrace

```bash
forge verify-contract <FACTORY_ADDRESS> src/DiveLogFactory.sol:DiveLogFactory \
  --chain-id 43113 --verifier sourcify --watch
# or with a Snowtrace API key:
forge verify-contract <FACTORY_ADDRESS> src/DiveLogFactory.sol:DiveLogFactory \
  --chain-id 43113 --verifier etherscan --etherscan-key $SNOWTRACE_API_KEY --watch
```

## Export artifacts for the frontend

The frontend reads `src/contracts/SovereignDiveLog.json` and
`src/contracts/DiveLogFactory.json` (abi + bytecode + deployedBytecode):

```bash
forge build && ./export-artifacts.sh
```

The EIP-712 fixture used by the frontend's vitest cross-check is regenerated
from the contract itself:

```bash
./export-fixture.sh
```

## Deployments

| Network | Chain ID | Contract | Address |
| --- | --- | --- | --- |
| Fuji | 43113 | DiveLogFactory | `0x921dc74BA049748BdFeE471F641f48688aDF8b49` |
| C-Chain | 43114 | DiveLogFactory | `0x3894070DDdA804f9ba96116c9bd810eF745f5999` |
| Fuji | 43113 | SovereignDiveLog (legacy, pre-factory) | `0x5adf6d5150a62d67fa1a18ac7dde8fcbad392565` |

> Both factories were deployed via Avalanche Builders Hub from
> `flattened/DiveLogFactory.flattened.sol` and verified byte-identical to this
> repo's compilation (solc 0.8.34 / cancun / optimizer 200) by direct
> `eth_getCode` comparison. The legacy Fuji `SovereignDiveLog` (and any logbook
> deployed directly from the dApp before the factories) remains fully usable —
> its owner registers it once via `adoptLogbook`.
