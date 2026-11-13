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
│       ├── IDiveLogTypes.sol        # enums + structs (incl. Saturation mode)
│       ├── IDiveLog.sol             # interface (ERC-165 id 0x4d89a8f9)
│       ├── IDiveLogTypedData.sol    # EIP-712 typed-data hashing library (domain version "2")
│       └── IERC165.sol
├── script/
│   ├── Deploy.s.sol                 # deploys the DiveLogFactory
│   └── EmitEip712Fixture.s.sol      # emits the TS<->Solidity EIP-712 test fixture
├── test/
│   ├── DiveLogFactory.t.sol         # unit + invariant tests for the registry
│   └── SovereignDiveLog.t.sol       # the full 48-test ERC reference suite
                                       # (headers, guards, batches, void/supersede,
                                       #  attestations, EIP-712 digests, gas report)
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

## Reference-asset provenance

`interfaces/` is byte-identical to the redesigned ERC-8260 reference assets
from ethereum/ERCs#1735 (commit `0122b754`): the thin packed header (bottom
time + total duration, table/schedule, both repetitive groups + surface
interval, Saturation mode), required SHA-256 `contentHash`, optional EIP-712
attestations bound to that hash (domain `DiveLog`, version `"2"`), batch cap
100, void/supersede, and nonce cancellation. The three former local hardening
deltas (EIP-2 low-`s` rejection, the `InvalidBatchSize` bound, date
validation) are part of the standard sources.

`SovereignDiveLog.sol` is the same upstream asset with exactly one local
character change (an em-dash replaced by a comma in the `_HALF_N` comment, to
keep the source ASCII); functionally identical, but not byte-identical. The
test file differs only in import paths for this project's `src/` layout. The
toolchain is pinned locally (solc 0.8.38 / cancun / optimizer 200, below);
upstream compiles the same `pragma ^0.8.20` sources on its own pins.

The `interfaces/` directory stays byte-identical to the ERC assets (excluded
from `forge fmt` via `foundry.toml`).

## Setup

```bash
# forge-std lives in deployment/lib/ (gitignored) — fetch it on a fresh clone
forge install foundry-rs/forge-std --no-commit

cp .env.example .env   # fill PRIVATE_KEY
source .env
forge build
forge test
```

> Compiler: solc **0.8.38**, `evm_version = cancun`, optimizer 200 runs;
> pinned for the v2 deployments. Measured gas is identical to the 0.8.34 pin
> the v1 factories were byte-verified at (logDive median 154,165;
> createLogbook median 2,341,779; SovereignDiveLog runtime code unchanged
> apart from the metadata tail), and 0.8.38 is the bug-fix-only release with
> an empty known-bug list. Avalanche has supported Cancun since the Durango
> upgrade (Feb 2024); the Helicon upgrade (2026) changed execution and gas
> pricing, not the EVM fork level. Sources remain `pragma ^0.8.20`, so
> upstream (PR #1735) is unaffected by this toolchain pin.

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
| Fuji | 43113 | DiveLogFactory **v2** | `0x2ec5e579E0B3e31C4c3e6ABE1F7c0eF7ACa4E740` |
| C-Chain | 43114 | DiveLogFactory **v2** | `0x36eB0768Ba245A4D002F35E3a17D3210c9C6BB83` |
| Fuji | 43113 | DiveLogFactory (v1, legacy) | `0x921dc74BA049748BdFeE471F641f48688aDF8b49` |
| C-Chain | 43114 | DiveLogFactory (v1, legacy) | `0x3894070DDdA804f9ba96116c9bd810eF745f5999` |
| Fuji | 43113 | SovereignDiveLog (legacy, pre-factory) | `0x5adf6d5150a62d67fa1a18ac7dde8fcbad392565` |

> The v2 factories were deployed 2026-11-13 from Remix with
> `flattened/DiveLogFactory.flattened.sol` at solc 0.8.38 / cancun /
> optimizer 200, and verified byte-identical to this repo's compilation by
> direct `eth_getCode` comparison on both chains (only the source-metadata
> hash differs, flattened vs multi-file layout). They mint ERC-8260 v2
> thin-header logbooks and are what the dApp pins.
>
> The v1 factories were deployed via Avalanche Builders Hub at the v1-era pin
> (solc 0.8.34 / cancun / optimizer 200) with the same verification; they mint
> v1-interface logbooks only and remain live for their existing books. The
> legacy Fuji `SovereignDiveLog` (and any logbook deployed directly from the
> dApp before the factories) remains fully usable on the v1 factories; its
> owner registers it once via `adoptLogbook`.
