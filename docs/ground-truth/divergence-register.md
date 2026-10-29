# Divechain Pro - Divergence Register

Recorded disagreements between documents or undecided design forks. An entry
marked **RULED** carries a decision that overrides the spec and whitepaper;
unmarked entries are open and must never be silently picked over.

Format:

  ## Topic
  D-n Short statement of the divergence
  body...
  **RULED <date>: the decision and its source>** (only for decided entries)

## Dive profile data

D-1 Full dive profiles on-chain vs off-chain with a hash anchor

  The on-chain `DiveData` struct carries summary fields only; depth/time
  sample arrays are not stored on-chain. Full profiles from dive-computer
  import would go off-chain (IPFS or a content-addressed store) with a
  `keccak256(profile)` hash anchored in `remarks` or a future ERC extension
  event.

  **RULED 2026-09: profiles stay off-chain, hash-anchored; documented in BACKLOG.md (UDDF / dive-computer import). Do not widen the on-chain struct with sample arrays.**

## Sponsored deployment

D-2 Factory-sponsored ("free") logbook claims vs pay-your-own-gas reality

  A sponsored-deploy relayer (factory v2 `createLogbookFor` with an EIP-712
  `CreateLogbook(owner)` signature, Turnstile, per-IP/wallet caps, funded hot
  wallet) is architecturally prepared but deferred.

  **RULED 2026-09: deferred; copy must not promise "free" or sponsored deploys until the relayer ships (BACKLOG.md). The existing 1:1 registry mapping is the replay protection.**
