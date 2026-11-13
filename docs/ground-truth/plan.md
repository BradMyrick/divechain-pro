# Divechain Pro - Plan Doors

Sections below whose titles name one-way doors or launch gates are extracted
by the gates as DOOR-* entries. They override everything except recorded
rulings. Never change a door without the owner.

## One-way door: deployed contract addresses

The v2 DiveLogFactory is live and byte-verified on Avalanche C-Chain (43114,
0x36eB0768Ba245A4D002F35E3a17D3210c9C6BB83) and Fuji (43113,
0x2ec5e579E0B3e31C4c3e6ABE1F7c0eF7ACa4E740), deployed 2026-11-13 per the
DIV-D-3 ruling (the v1 factories at 0x3894…5999 / 0x921d…8b49 stay live for
their existing v1 books). Changing a deployed address, chain id, or redeploying
the factory strands every existing logbook mapping. Contract-level changes
ship as a new reference implementation and a coordinated factory v2 with
migration via adoptLogbook - never a silent swap of addresses in the frontend
config.

## One-way door: EIP-712 domain and typed-data structure

The EIP-712 domain separator (name, version, chainId, verifyingContract) and
the DiveLogTypedData field layout are load-bearing: change them and every
existing attestation signature becomes invalid, and deployed contracts cannot
be patched. The typed-data hash also mirrors into the ERC-8260 standard PR
(ethereum/ERCs#1735). Any change to domain, version string, field order, or
canonical EIP-191 encoding is a door: stop for the owner.

## One-way door: on-chain dive records

Once dives are logged, immutability is the product. Adding any edit, delete,
or admin-rewrite path to SovereignDiveLog (or a UI affordance that implies
records can be changed) breaks the honest-audit-trail promise the README
sells. Corrections are void/supersede only.

## Launch gate: sponsored-deploy copy

Never ship or preview copy claiming deployments are "free", sponsored, or
relayer-paid until the v2 relayer is actually deployed. The factory v2 design
is prepared but deferred (see divergence register D-2).

## Launch gate: dependency posture

The `overrides` block pinning axios >= 1.20.0 and ws >= 8.21.3 stays in
package.json until upstream WalletConnect-stack releases move past the
patched versions, and CI's dependency-review must keep failing on high
severity. A dependency bump that drops the overrides or re-audits to high
severity is a launch-gate violation.

## Launch gate: verified-source parity

What is deployed must be what this tree compiles: the export-artifacts script
and CI ABI-sync check stay mandatory, and any deployment must re-verify
byte-identity via eth_getCode before the README's address tables are updated.
