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

## ERC-8260 v2 cutover

D-3 Migrate the dApp and indexer to the v2 thin-header standard before ERC review, or keep them on v1 until the ERC is merged

  The redesigned ERC-8260 (ethereum/ERCs#1735 commit 0122b754, adopted in
  `deployment/` at commit 0c877f7) breaks the v1 interface: new ERC-165 id,
  packed header, required UDDF `contentHash`, EIP-712 domain version "2". The
  deployed factory embeds v1 logbook creation code and the v1 interface id in
  `adoptLogbook`, so a v2 dApp cannot use it.

  **RULED 2026-11-12 (owner, in session): full v2 cutover in one PR. Deploy a new DiveLogFactory (Fuji, then C-Chain) recompiled against the v2 sources, byte-verify via eth_getCode parity, and pin the new addresses; the old factory and the owner's v1 logbook stay untouched on-chain (fresh v2 logbook, history re-logged via the batch import). The dApp generates the required UDDF deterministically in the browser (SHA-256 via WebCrypto) and stores profiles locally keyed by contentHash; publishing to IPFS is opt-in, AES-256-GCM encrypted before pinning, pinned with a user-supplied credential, never through a Divechain server. Corollary principles: (1) key loss never means logbook loss - the on-chain header is the record of truth and every encryption scheme is a swappable privacy layer; (2) capture-at-source (hashing the dive computer's own export bytes on the phone) is the strategic direction for the future logbook-wallet, and client substitutability is the constraint it may never violate; (3) that wallet will be open source.**
