# Divechain Pro - Review Rules

House rules the gates enforce on every diff. Numbered entries are RULE-n.
Rules 1-10 mirror the aiwrangler standard set, adapted to this repo's stack
(TypeScript/React dApp, Solidity contracts, viem indexer).

1. Fail loud, not silently

  Malformed or missing values are errors, not defaults. No nullish-coalesce
  fallbacks, no empty catch clauses that swallow failures, no
  silently-substituted values where parsing, decoding, or validating
  chain/API input could fail. Documented configuration defaults with a stated
  value are acceptable.

2. Public surface is a commitment

  New exported functions, React pages/routes, contract ABI surface, or
  indexer CLI flags expand what other software can depend on. Changing the
  public surface requires an argument that enumerates what exists and why the
  addition is needed.

3. Claims must be visible in the diff

  A claim about what the code now does must be demonstrably present in the
  added lines. If the diff does not visibly do it, the claim is a finding.

4. Validate external input at the boundary

  Anything that arrives from a chain read, an RPC, an API response, a signed
  message, or user input is untrusted until validated against local
  expectations (chain id, contract address, ABI shape, schema, signature).
  Never act on a self-reported claim from a message.

5. Errors name the culprit

  Every error, revert string, and rejected-promise message must name the
  failing value, field, or operation. "Something went wrong" and "invalid
  input" are findings.

6. House style

  No em dashes in code, comments, or commit messages. No AI-identifying
  trailers in commits. Reference sibling directories by name, not by relative
  path.

7. Todo markers name their backend

  Every todo names what it waits on: TODO(contracts), TODO(indexer),
  TODO(exporter), TODO(noaa-api), TODO(design). A bare untagged todo marker
  is a finding.

8. New behavior ships with a test

  New contract behavior gets a forge test; new app behavior gets a vitest
  test; indexer changes exercise the anvil harness. A diff that adds behavior
  without a test that would fail without it is a finding.

9. Limits state units and who pays

  Any new batch cap, rate limit, cache TTL, gas bound, or pagination chunk
  states its units, why the value is safe, and who pays when it trips.

10. Keys, signatures, digests, and deployed addresses need human eyes

  Anything touching private keys, signing or key derivation, EIP-712 domains
  and typed-data hashing, keccak/ecrecover logic, nonce/replay handling,
  deployed contract addresses, or disclosure of user data requires human
  review even if it looks correct. The gates will route these diffs to a
  human; acknowledge them in the webui after review.
