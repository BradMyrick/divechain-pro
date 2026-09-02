# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Please use GitHub's private vulnerability reporting:

→ https://github.com/BradMyrick/divechain-pro/security/advisories/new

- **In scope:** the ERC-8260 reference contracts (`deployment/src/`), the
  deployed `DiveLogFactory` instances, the dApp (`src/`), and the indexer
  (`indexer/`).
- **Out of scope:** third-party wallet software, RPC providers, and findings
  already documented below as accepted trade-offs.
- We aim to acknowledge reports within 7 days and support coordinated
  disclosure (90 days or later at the reporter's preference). Note that the
  deployed contracts are immutable by design — mitigations for contract-level
  findings will typically ship in the reference implementation and a
  redeployed factory, not in-place patches.

---

# Security & Scaling Review

Findings from the ERC-8260 / Divechain contract and dApp review (2026-09).
Statuses reflect the current tree; upstream items are also applied to the ERC
fork for [ethereum/ERCs#1735](https://github.com/ethereum/ERCs/pull/1735).

## Summary

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Wallet->logbook binding existed only in browser localStorage | **High (UX/liveness)** | Fixed: `DiveLogFactory` lookup on connect; localStorage demoted to cache (2026-09) |
| 2 | `ecrecover` accepted high-s (malleable) signatures | Hygiene | Fixed in `SovereignDiveLog._recoverSigner`; spec updated (upstream PR) |
| 3 | `batchLogDives` unbounded array (block-gas self-DoS) | Low | Fixed: `MAX_BATCH_SIZE = 100`, `InvalidBatchSize` |
| 4 | `diveDate == 0` accepted | Low | Fixed: `InvalidDate` |
| 5 | `owner` immutable - lost key freezes the logbook forever | Design trade-off | Documented (intentional sovereignty; see notes) |
| 6 | Attestation trust is self-reported | Design trade-off | Documented; UI copy says "cryptographically verifiable", not "unfakeable" |
| 7 | Logbook page issues 3 RPCs per dive (N+1) | Medium (scaling) | Fixed: single `useReadContracts` batch (chunks of 100 + per-dive void/att reads, react-query-cached) |
| 8 | Manual bind accepted any 42-char `0x` string | Medium | Obsolete: bind forms removed; factory is authoritative; remaining manual entry validated |
| 9 | EIP-712 TS mirror of `DiveLogTypedData` never cross-tested vs Solidity | Medium | Fixed: forge-generated fixture + vitest cross-check (digest + signature recovery + malleability note) |
| 10 | No tests / no CI anywhere | Medium | Fixed: 28 forge tests, 16 vitest tests, indexer anvil harness, GitHub Actions CI |
| 11 | ABI artifact hand-copied via README snippet (drift risk) | Low | Fixed: `deployment/export-artifacts.sh`; CI enforces sync |
| 12 | Dive profile chart synthesized from max/avg depth (misleading) | Low | Fixed: `DiveProfileSketch` labeled "Estimated from log entry"; real telemetry lands with UDDF |
| 13 | `setState` during render in `DiveContractContext` | Low (React) | Fixed: factory-based context rewrite (effects only) |
| 14 | Unused `ethers` dependency (bundle bloat) | Low | Removed |
| 15 | EIP-1167 clone pattern incompatible with `immutable owner` | Constraint | Documented; factory deploys full contracts by design |
| 16 | Blank page when `VITE_WALLETCONNECT_PROJECT_ID` missing | Medium (DX) | Fixed: injected-wallet fallback + visible warning banner; headless smoke test covers |
| 17 | Dependency audit: high-severity transitives (axios/ws in the WalletConnect stack; react-router) | High | Fixed: react-router 7.18.3, `overrides` pin axios>=1.20/ws>=8.21.3; remainder (moderates) documented below |

## Dependency posture

`npm audit --omit=dev` after overrides: **0 high/critical, 22 moderate** — all
inside the WalletConnect connector stack (relayed transport, socket.io client
internal to `@walletconnect/*`). No app code routes user-controlled URLs
through axios, and the app makes no direct use of socket.io/ws. Re-audit on
every dependency bump; CI runs `dependency-review-action` with
`fail-on-severity: high` on PRs. Keep the `overrides` block in package.json
until upstream releases move past the patched versions.

## Notes on design trade-offs (accepted)

**Immutable owner (#5).** A lost key permanently freezes the logbook: no
transfers, no rotation, no recovery. This is the core sovereignty trade-off of
ERC-8260 (append-only, no admin, no backdoor) and is deliberate. Career-critical
users should consider a hardware wallet or a multisig (e.g. a Safe) as the
logbook owner - `createLogbook()` from a smart-contract wallet works today.
A transferable-owner variant would change the security model and belongs in
standards discussion, not a patch.

**Self-reported attestations (#6).** Anyone can attest any dive; the
cryptography proves *who signed*, not *that the dive happened*. Colluding
wallets can manufacture attestated dives. This is the correct v1 trust model
(attestations are endorsements, not proofs), but client copy must not
overstate it.

**Adopt trust boundary.** `adoptLogbook` verifies ERC-165 support and
`owner() == msg.sender`, but a custom contract can fake both. This is
acceptable: a spoofed adoption can only pollute the spoofer's *own* registry
slot (self-harm), and every factory-created logbook is a byte-identical
`SovereignDiveLog`. Covered by `test_AdoptLogbook_SpoofOnlyAffectsOwnSlot`.

**Front-running.** `createLogbook`/`adoptLogbook` key everything to
`msg.sender` and take no owner parameters, so there is nothing to front-run
(a relayed copy of a sponsored deploy just gives the diver their logbook).
Attestation relaying is safe for the same reason - the attester identity is
recovered from the signature, not the relayer.

## Test coverage

`deployment/test/`:

- `DiveLogFactory.t.sol` - create/adopt/release happy paths and reverts,
  EOA and malicious-contract adoption, event emission, and a fuzzed invariant:
  *any registered logbook reports its registrant as owner and supports
  `IDiveLog`*, plus released slots are always reclaimable.
- `SovereignDiveLog.t.sol` - logging guards (depth/time/date), batch bounds
  (0, 100, 101), EIP-712 attestation end-to-end, nonce ordering, replay,
  high-s malleability rejection, malformed signatures, void/supersede.
