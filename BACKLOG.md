# Backlog

Documented technical approaches for the next milestones. Not yet scheduled.

## Profile key management ladder (post-v2)

Ruled 2026-11-12 (DIV-D-3): key loss never means logbook loss; the on-chain
header is the record of truth and every encryption scheme is a swappable
privacy layer. The ladder, cheapest first:

- **Now (shipped with v2):** random AES-256-GCM vault key in localStorage,
  exportable as a string, profiles stored locally + carried in the batch JSON
  export; opt-in encrypted IPFS publishing with a user-supplied pinning
  credential.
- **Fast-follow: WebAuthn PRF derivation** with feature detection and random
  key fallback (PRF is deterministic by specification, unlike ECDSA signing;
  support is spottier than passkeys themselves - degrade gracefully, never
  block logging).
- **Endgame: threshold decryption** (Lit-style access conditions: decrypt for
  whoever proves control of wallet X). No key to lose, no single gatekeeper;
  gated on a maturity evaluation of the network used. Note: re-encryption
  migration keeps every dive valid (contentHash is over the plaintext) but
  leaves stale on-chain profileURIs needing an off-chain lookup keyed by
  contentHash.
- **Product option: opt-in recovery escrow** - wrap the vault key under a
  divechain.pro recovery public key at the diver's explicit choice. Truthful
  copy required ("we can read your profiles if you opt in"); it softens the
  "no company holds a master key" pillar for opt-ins only.

## Shop verification service (monetization, custody-free)

Shops, employers and agencies pay for a turnkey verification report: profile
fetched and decrypted with the diver-granted key, SHA-256 compared to the
on-chain contentHash, attestation signatures listed, PDF notarized. Anyone
could do this themselves with the key the diver gives them; the service sells
convenience, never custody. Natural companion: the logbook-wallet below.

## Open-source logbook-wallet (strategic direction)

Ruled 2026-11-12 (DIV-D-3): capture-at-source is the strategic direction -
hash the dive computer's own export bytes at ingestion (phone BLE) rather
than reconstructing UDDF in the browser, because the strongest contentHash
commits to the instrument's record. Constraints and shape:

- **Client substitutability is inviolable:** our wallet is the best client,
  never the only one; the web dApp stays first-class; exports stay open.
- **Open source:** no user can be technically trapped; anyone can build
  their own version. Reproducible builds still needed so the app-store
  binary is provably this source.
- Direction: passkey-signer smart account (ERC-4337 on Avalanche, cents/tx;
  biometric-gated writes; no seed phrase to phish; passkey sync + guardian
  recovery), native secure-enclave key derivation (dissolves the browser
  WebAuthn-PRF support matrix), thin mobile shell reusing the web UI.
- Spike to validate first: Shearwater-only BLE ingestion with the one-thumb
  flow hash-at-source -> AES-GCM encrypt -> pin -> logDive.

## Bühlmann ZHL-16C dive planner

The recreational tools (`src/lib/planning/`) ship single-dive NOAA/USN tables only;
repetitive credit and deco need a real tissue model. Phase 4 of the site-perfection
plan (after dive-site conditions and forums):

- ZHL-16C coefficients (N2 + He compartments), gradient factors lo/hi, square and
  multilevel profiles, deco gas switches (EAN50/O2), trimix, surface-interval
  washout for repetitive dives.
- Integrate with the existing modules: CNS/OTU from the O2 clock, gas planning from
  rock bottom across bottom + deco gases, runtime schedule + printable slate (jspdf).
- Validation: unit tests against published planner vectors (Subsurface-style
  reference outputs) plus property tests (deeper ⇒ shorter NDL, GF monotonicity).
- Table provenance for phase 1 lives in the modules: air NDL from 46 CFR 197
  App. A (USN source), NOAA CNS/OTU, DAN 2002 flying consensus — all public domain.

## Sponsored deployment ("first 1,000 divers free")

Deferred by decision (2026-09). Architecture is prepared:

- `DiveLogFactory` v2 adds `createLogbookFor(address owner, bytes signature)`:
  an EIP-712 `CreateLogbook(owner)` digest signed by the diver, relayed by a
  serverless worker (Cloudflare Worker + Turnstile captcha, per-IP/wallet caps,
  funded hot wallet). The existing 1:1 registry mapping is the replay
  protection — a second relay of the same signature reverts
  `AlreadyRegistered`.
- v1 registrations migrate to v2 with the same `adoptLogbook` pattern.
- Copy flips on when the relayer ships; never promise "free" before it exists.

## UDDF / dive-computer import

The single biggest adoption lever: parse Shearwater/Garmin/Suunto exports
(`.uddf`, `.sml`, `.db`), preview, then batch-log history via `batchLogDives`
(capped at 100 per tx - chunk imports across transactions).

**Status (2026-11): the generic-JSON half is shipped, on the v2 thin
header.** `/import` parses the Divechain Batch JSON standard (posted in the
README, exported from the Logbook), the commercial `commercial_dive_logs`
repair format, and best-effort generic JSON; it prunes dives already on-chain
(day + bottom time + max depth), chunks at the measured 8 dives/tx, derives
each dive's deterministic UDDF + SHA-256 contentHash at send time, and walks
the user through sequential signing with pre-flight gas estimates. Still
open:

- A UDDF 3.2.3 parser (streit.cc) via browser `DOMParser`, slotting into the
  same parser registry (`src/lib/batchImport.ts`) - Subsurface/DivingLog
  exports make onboarding most dive computers trivial, and the parser feeds
  the exact computer-export bytes to `contentHash` (capture-at-source).
- The dApp-side writer (`src/lib/uddf.ts`) serializes the form/import draft
  deterministically; a real computer export should be hashed verbatim
  instead of round-tripping through the draft.
- `DiveProfileSketch` (src/components/DiveProfileSketch.tsx) already renders
  either an estimated sketch or real sample arrays - feed it the imported
  samples.

## PWA + offline queue

Installable app; log dives on the boat with no signal.

- `vite-plugin-pwa`, cache-first shell + runtime RPC cache.
- Queue drafts in IndexedDB; on reconnect, submit via `batchLogDives` (the
  contract's batch primitive is exactly this use case). Surface queue state in
  the UI so nothing is silently lost.
- Caveat: EIP-712 attestations signed offline can be queued the same way —
  nonces make them replay-safe.

## Chain-backed attester badges

`attesterBadge()` (src/lib/diverStats.ts) is demo-backed today. With the
indexer live, resolve each attester's own logbook + stats from
`indexer/out/data.json` (or its served endpoint) to badge attestations with
"Verified diver — N dives · Xh". No new contracts needed.

## Public-profile SEO

`/diver/:address` is client-rendered; when there are real profiles worth
indexing, add prerendering (vite prerender plugin or edge worker) so search
engines see the stat cards.

## og:image assets

A raster `og:image` (1200×630) exported from the flags mark. The SVG masters
live in `src/components/flags/Flags.tsx`; export needs a rasterizer
(rsvg-convert/inkscape) at release time.
