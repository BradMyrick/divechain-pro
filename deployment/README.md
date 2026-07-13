# Divechain.pro — ERC-8260 Deployment

Foundry project for the **final ERC-8260 Dive Log** reference contract
(`SovereignDiveLog`). The sources under `src/` are verbatim copies of the
approved ERC reference implementation (`assets/erc-8260/` in the ERCs repo),
with only the import paths adjusted for this project's layout. The deployed
bytecode is therefore byte-identical to the canonical ERC-8260 reference impl.

## Layout

```
deployment/
├── src/
│   ├── SovereignDiveLog.sol        # ERC-8260 reference implementation (owner-only logbook)
│   └── interfaces/
│       ├── IDiveLogTypes.sol       # enums + structs
│       ├── IDiveLog.sol            # interface (ERC-165 id 0x321ef561)
│       ├── IDiveLogTypedData.sol   # EIP-712 typed-data hashing library
│       └── IERC165.sol
├── script/Deploy.s.sol             # forge deploy script
├── foundry.toml
└── out/                            # compiled artifacts (gitignored)
```

## Setup

```bash
# 1. install forge-std (already vendored at lib/forge-std)
# 2. copy env
cp .env.example .env   # fill PRIVATE_KEY
source .env

# 3. compile
forge build
```

## Deploy

```bash
# Fuji testnet (chain 43113)
forge script script/Deploy.s.sol \
  --rpc-url $FUJI_RPC_URL --broadcast --private-key $PRIVATE_KEY --slow

# Avalanche C-Chain mainnet (chain 43114)
forge script script/Deploy.s.sol \
  --rpc-url $CCHAIN_RPC_URL --broadcast --private-key $PRIVATE_KEY --slow
```

The deployer becomes the logbook `owner` unless `LOGBOOK_OWNER` is set.

## Verify source on Snowtrace

```bash
forge verify-contract <ADDRESS> src/SovereignDiveLog.sol:SovereignDiveLog \
  --chain-id 43113 --verifier sourcify --watch
# or with a Snowtrace API key:
forge verify-contract <ADDRESS> src/SovereignDiveLog.sol:SovereignDiveLog \
  --chain-id 43113 --verifier etherscan --etherscan-key $SNOWTRACE_API_KEY --watch
```

## Export artifacts for the frontend

The frontend reads `src/contracts/SovereignDiveLog.json` (abi + bytecode +
deployedBytecode). Regenerate it after recompiling:

```bash
python3 - <<'PY'
import json
art = json.load(open("out/SovereignDiveLog.sol/SovereignDiveLog.json"))
json.dump({
    "abi": art["abi"],
    "bytecode": "0x" + art["bytecode"]["object"],
    "deployedBytecode": "0x" + art["deployedBytecode"]["object"],
}, open("../src/contracts/SovereignDiveLog.json", "w"), indent=2)
print("regenerated frontend artifact")
PY
```

## Deployments

| Network   | Chain ID | Address                                    |
|-----------|----------|--------------------------------------------|
| Fuji      | 43113    | 0x5adf6d5150a62d67fa1a18ac7dde8fcbad392565 |
| C-Chain   | 43114    | _(deploy per user via the dApp, or script)_ |

> The dApp deploys a fresh `SovereignDiveLog` per wallet from the browser, so
> each diver owns their own sovereign logbook contract. The script above is for
> reference / testing deployments.
