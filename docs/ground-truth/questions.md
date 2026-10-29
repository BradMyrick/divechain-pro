# Divechain Pro - Open Questions

Questions whose answer changes how work should be built. An entry marked
**ANSWERED** overrides the spec and whitepaper. Unanswered entries block
tasks that would build on one side of them: ask, do not assume.

Format:

  ## Area
  1. The question
  body...
  **ANSWERED <date>: the answer and its source>** (only for answered entries)

## Ownership model

1. Should a transferable-owner logbook variant exist?

  SECURITY.md accepts immutable owner as the core sovereignty trade-off
  (lost key freezes the logbook forever) and states that a transferable
  variant "belongs in standards discussion, not a patch". Until the ERC
  discussion rules, no ownership-transfer code path may be built.

## Indexer serving

2. Do attester badges read `data.json` or a served indexer endpoint?

  Chain-backed attester badges (BACKLOG.md) can resolve attester logbooks
  from `indexer/out/data.json` or from a hosted indexer endpoint. The choice
  affects hosting, freshness, and the dApp's failure modes.

## Profile pages

3. Prerender via vite plugin or edge worker?

  Public-profile SEO (BACKLOG.md) needs prerendering of `/diver/:address`;
  the approach (build-time vite prerender plugin vs edge worker) is
  undecided.

## Conditions provider

4. When does a commercial marine-conditions source slot in?

  The provider layer is isolated so a commercial source can replace the
  public-domain US-government stack. No trigger criteria are documented.
