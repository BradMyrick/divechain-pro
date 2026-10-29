# Divechain Pro

Sovereign on-chain scuba dive logbook: React 19 + TypeScript + Vite dApp,
ERC-8260 Solidity contracts (Foundry), self-verifying viem indexer.
Avalanche C-Chain (43114) production, Fuji (43113) testnet.

## Commands

- `npm run dev` - vite dev server (copy `.env.example` to `.env.local` first)
- `npm run build` - tsc -b && vite build
- `npm test` - vitest (unit + EIP-712 cross-check vs the contract fixture)
- `npm run lint` - eslint
- `npm run smoke` - headless-browser render check (needs a dev/preview server)
- `cd deployment && forge test` - contract tests (fetch forge-std first, see deployment/README.md)
- `cd indexer && npm test` - indexer tests incl. anvil harness

## Source of truth

`docs/ground-truth/` is the ground-truth corpus the aiwrangler gates cite:
the spec (SPEC-1..12), review rules (RULE-1..10), divergence register
(rulings override everything), open questions, and one-way doors. When a
decision changes, update those files - not just the code. The distilled
whitepaper lives at `.aiwrangler/whitepaper.txt` (cached; put a real PDF at
`docs/ground-truth/whitepaper.pdf` to replace it).

## Gate discipline (aiwrangler)

- Call `wrangler_config` at session start to confirm the corpus loads.
- Call `wrangler_plan` before writing code; it cites the sections that govern
  the task. `clarify` means ask the user; `human` means stop for the owner.
- Call `wrangler_check` before declaring anything done, and again after each
  substantive revision. Fix every cited finding; do not declare done on
  DEGRADED.
- `human` verdicts (keys, signatures, EIP-712 domain, deployed addresses,
  digests) are resolved by the owner reviewing the diff in the webui
  (`aiwrangler-webui` from this directory) and acknowledging it there.
- Never weaken a gate to pass it; overrides set in the webui expire on the
  next PASS by design.

## Invariants that trump convenience

- On-chain dive records are immutable; corrections are void/supersede only.
- The EIP-712 domain and typed-data layout are one-way doors.
- Deployed factory addresses (README) are pinned and byte-verified.
- Zero personal data on-chain; the wallet is the identity.
- Client copy says "cryptographically verifiable", never "unfakeable".
- Conditions and planning data come from public-domain sources or not at all.
