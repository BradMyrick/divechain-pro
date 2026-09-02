# Backlog

Documented technical approaches for the next milestones. Not yet scheduled.

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
(`.uddf`, `.sml`, `.db`), preview, then batch-mint history via `batchLogDives`
(capped at 100 per tx — chunk imports across transactions).

- Real sample data: `DiveData.leaveSurfaceTime/leaveBottomTime/
  reachSurfaceTime` + depth/time samples are NOT carried by the on-chain
  struct (only summary fields). Keep full profiles off-chain (IPFS or a
  content-addressed store) and anchor `keccak256(profile)` in `remarks` or a
  future ERC extension event.
- `DiveProfileSketch` (src/components/DiveProfileSketch.tsx) already renders
  either an estimated sketch or real sample arrays — feed it the imported
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
