// Profile vault: local custody of the off-chain UDDF profiles that v2 dive
// headers commit to with `contentHash`.
//
// Custody rules (ground truth, ruled 2026-11-12):
//   * Key loss never means logbook loss. The on-chain header is the record of
//     truth; profiles are a swappable privacy layer over it.
//   * Nothing here ever touches a divechain.pro server. Publishing pins
//     ciphertext to IPFS with credentials the diver supplies (their own
//     pinning service account); the default is local-only.
//   * The AES-256-GCM key is random, generated in the browser, persisted in
//     localStorage, exportable as a string, and shareable by the diver. A
//     future passkey/PRF derivation may replace the source of this key
//     without changing anything else (BACKLOG).
//
// Published profile bytes are ciphertext and public forever: we encrypt
// before pinning and record `profileURI = ipfs://<cid>` on-chain. Anyone can
// fetch the blob; only key holders can read it. Verification is by
// contentHash: fetch, decrypt, SHA-256, compare on-chain.

import type { StoredProfile } from "./types";

const PROFILES_KEY = "divechain_profiles_v1";
const VAULT_KEY = "divechain_vault_key_v1";
const IPFS_CONFIG_KEY = "divechain_ipfs_v1";

// ---------------------------------------------------------------- profiles

function readProfiles(): Record<string, StoredProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "{}") as Record<string, StoredProfile>;
  } catch {
    return {};
  }
}

function writeProfiles(all: Record<string, StoredProfile>): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
}

export function saveProfile(contentHash: `0x${string}`, profile: StoredProfile): void {
  const all = readProfiles();
  all[contentHash] = profile;
  writeProfiles(all);
}

export function getProfile(contentHash: `0x${string}`): StoredProfile | undefined {
  return readProfiles()[contentHash];
}

export function profileCount(): number {
  return Object.keys(readProfiles()).length;
}

export function markPublished(contentHash: `0x${string}`, uri: string): void {
  const all = readProfiles();
  const p = all[contentHash];
  if (p) {
    p.published = { uri, at: Date.now() };
    writeProfiles(all);
  }
}

// ---------------------------------------------------------------- vault key

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The raw 32-byte vault key, base64. Present when a key exists. */
export function getVaultKeyString(): string | undefined {
  return localStorage.getItem(VAULT_KEY) ?? undefined;
}

/** Import a previously exported vault key (32 bytes, base64). */
export function setVaultKeyString(b64: string): void {
  if (fromB64(b64).length !== 32) throw new Error("Vault key must be 32 bytes (base64)");
  localStorage.setItem(VAULT_KEY, b64);
}

/** Get or create the AES-256-GCM vault key as a WebCrypto key. */
export async function ensureVaultKey(): Promise<CryptoKey> {
  let b64 = getVaultKeyString();
  if (!b64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    b64 = toB64(raw);
    localStorage.setItem(VAULT_KEY, b64);
  }
  return crypto.subtle.importKey("raw", fromB64(b64) as BufferSource, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

export interface SealedProfile {
  /** iv (12 bytes) || ciphertext, base64. This is what gets pinned. */
  sealed: string;
}

/** AES-256-GCM. Random IV, prepended to the ciphertext. */
export async function sealProfile(plaintext: string): Promise<SealedProfile> {
  const key = await ensureVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return { sealed: toB64(out) };
}

/** Decrypt a sealed profile back to plaintext UDDF. Throws on wrong key. */
export async function openProfile(sealed: string): Promise<string> {
  const key = await ensureVaultKey();
  const buf = fromB64(sealed);
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

// ---------------------------------------------------------------- ipfs

export interface IpfsConfig {
  /** Pinata API JWT supplied by the diver (their own account). */
  jwt: string;
}

export function getIpfsConfig(): IpfsConfig | undefined {
  try {
    const raw = localStorage.getItem(IPFS_CONFIG_KEY);
    if (!raw) return undefined;
    const cfg = JSON.parse(raw) as IpfsConfig;
    return cfg.jwt ? cfg : undefined;
  } catch {
    return undefined;
  }
}

export function setIpfsConfig(cfg: IpfsConfig): void {
  localStorage.setItem(IPFS_CONFIG_KEY, JSON.stringify(cfg));
}

export function clearIpfsConfig(): void {
  localStorage.removeItem(IPFS_CONFIG_KEY);
}

/** Pin bytes to IPFS via the diver's own Pinata account; returns the CID. */
export async function pinToIpfs(bytes: Uint8Array, name: string): Promise<string> {
  const cfg = getIpfsConfig();
  if (!cfg) throw new Error("No pinning account configured");
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart]), name);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.jwt}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Pinning failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error("Pinning service returned no CID");
  return json.IpfsHash;
}

export interface PublishResult {
  uri: string;
  cid: string;
}

/** Seal a profile (AES-256-GCM) and pin the ciphertext to IPFS. */
export async function publishProfile(uddfText: string, name: string): Promise<PublishResult> {
  const { sealed } = await sealProfile(uddfText);
  const bytes = new TextEncoder().encode(sealed);
  const cid = await pinToIpfs(bytes, name);
  return { uri: `ipfs://${cid}`, cid };
}
