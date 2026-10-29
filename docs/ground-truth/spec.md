# Divechain Pro - Protocol Specification

Derived from the README, SECURITY.md review, and the ERC-8260 reference
implementation. This file is the spec the aiwrangler gates cite. Numbered
headings are normative requirements; update this file when a decision changes,
then let the corpus hash move.

## 1. Dive records are immutable (I)

A logged dive can never be altered or deleted. Corrections happen by voiding
(with an on-chain reason) or superseding (logging a replacement that references
the original). Any code path that edits or removes an existing dive record is
a contradiction of this spec.

## 2. Sovereign ownership, no backdoors (I)

Each logbook is a `SovereignDiveLog` owned outright by the diver's wallet. The
owner key is immutable: no transfers, rotation, recovery, admin key, or
upgrade path exists or may be added. Lost keys freeze the logbook by design.
The factory deploys full contracts, not EIP-1167 clones, because `immutable
owner` is incompatible with cloning.

## 3. The factory registry is authoritative (II)

`DiveLogFactory` is the single source of truth for the wallet-to-logbook
mapping. On connect, the dApp resolves the logbook through the factory
(`lookupLogbook`); browser localStorage is a cache only and must never be
treated as the binding. Bind forms that accepted manual addresses are gone by
design; any remaining manual entry must be validated.

## 4. Attestations are EIP-712 bound and replay-proof (III)

Buddy attestations are EIP-712 typed-data signatures bound to the logbook
address and the dive number, with per-logbook nonces. The signature must be
recoverable via `ecrecover` with low-s only (malleable high-s signatures are
rejected). The attester identity is recovered from the signature, never from
the relayer. `createLogbook`/`adoptLogbook` take no owner parameters, so
relayed or front-run copies are harmless.

## 5. Zero personal data on-chain (II)

Nothing about a diver is stored on-chain except what the dive record standard
requires. No names, birth dates, certification numbers, or biometrics may be
added to on-chain structures or events. The wallet address is the identity.

## 6. Input guards and batch bounds (III)

`batchLogDives` is capped at `MAX_BATCH_SIZE = 100` and reverts with
`InvalidBatchSize` beyond it. `diveDate == 0` reverts with `InvalidDate`.
Depth and time guards reject impossible values. Client-side importers must
chunk across transactions rather than raise the cap.

## 7. ERC-8260 conformance (IV)

The dive-log interface is `IDiveLog` with ERC-165 id `0x321ef561`.
`adoptLogbook` verifies ERC-165 support and `owner() == msg.sender` before
registering an external logbook. A spoofed adoption can only pollute the
spoofer's own registry slot; that trade-off is accepted and tested.

## 8. Trust-model honesty in client copy (II)

The cryptography proves who signed, not that the dive happened. UI and
marketing copy must say "cryptographically verifiable" and never "unfakeable"
or "proof the dive happened". Attestations are endorsements, not proofs.

## 9. Deployments are byte-verified (IV)

The deployed `DiveLogFactory` instances (Avalanche C-Chain 43114
`0x3894070DDdA804f9ba96116c9bd810eF745f5999`, Fuji 43113
`0x921dc74BA049748BdFeE471F641f48688aDF8b49`) were deployed from this source
tree and verified byte-identical via direct `eth_getCode` comparison. Contract
mitigations ship as a new reference implementation and redeployed factory,
never in-place patches (the contracts are immutable by design).

## 10. Public-domain data provenance (V)

Marine conditions (NWS, NDBC, CO-OPS, NHC) and dive-planning tables (USN 46
CFR 197 App. A, NOAA CNS/OTU, DAN flying guidance) come from U.S. government
public-domain sources only. No API keys, no third-party accounts. Non-US
sites show curated climatology rather than non-public data. The provider
layer stays isolated so a commercial source can slot in later.

## 11. Demo mode and tools are read-only and local (V)

The `/demo` route is read-only with no wallet. The planning tools are pure
client-side math; no dive data leaves the browser. The wallet-free fallback
(injected wallets without a WalletConnect project id) must show a visible
warning banner, never a blank page.

## 12. Artifacts regenerate, never hand-copy (V)

The frontend contract artifacts (`src/contracts/`) are produced by
`deployment/export-artifacts.sh`, and CI enforces they match. Hand-copied or
drifted ABIs are a finding. The EIP-712 TypeScript mirror must stay
cross-tested against the Solidity original via the forge-generated fixture.
