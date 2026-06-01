import { type KeyObject } from 'node:crypto';
import {
  buildSignedPayload,
  computeEntryHash,
  GENESIS_PREV_HASH,
  verifyPayload,
} from './crypto.js';
import { allSigningLog, type DB, type SigningLogRow } from './db.js';

export interface ChainVerificationResult {
  valid: boolean;
  count: number;
  /** Populated when `valid` is false: the first broken row + reason. */
  brokenAt?: {
    index: number;
    id: string;
    reason: 'prev_hash_mismatch' | 'entry_hash_mismatch' | 'signature_invalid';
  };
}

/**
 * Walk the signing_log in append order and assert the hash chain is intact.
 *
 * For each row i:
 *  - row.prev_entry_hash MUST equal the previous row's entry_hash
 *    (or GENESIS_PREV_HASH for the first row).
 *  - row.entry_hash MUST equal the recomputed SHA-256 over the same fields.
 *  - row.signature MUST be a valid Ed25519 signature (under `publicKey`) over
 *    the canonical payload (sub ‖ signerName ‖ doc_hash ‖ created_at).
 *
 * The hash-chain checks alone are NOT enough: the entry_hash algorithm is
 * public and key-less, so an attacker with DB write access could recompute a
 * consistent chain over forged rows. Only the Ed25519 signature — which an
 * attacker cannot produce without the private key — proves authenticity. The
 * `publicKey` is therefore REQUIRED; callers must thread it in.
 *
 * Any tampering with id/sub/signer_name/created_at/doc_hash/signature, or a
 * deleted / reordered row, breaks one of these checks.
 */
export function verifyChain(
  rows: SigningLogRow[],
  publicKey: KeyObject,
): ChainVerificationResult {
  let prev = GENESIS_PREV_HASH;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.prev_entry_hash !== prev) {
      return {
        valid: false,
        count: rows.length,
        brokenAt: { index: i, id: row.id, reason: 'prev_hash_mismatch' },
      };
    }
    const recomputed = computeEntryHash({
      prevEntryHash: row.prev_entry_hash,
      id: row.id,
      sub: row.sub,
      createdAt: row.created_at,
      docHash: row.doc_hash,
      signature: row.signature,
    });
    if (recomputed !== row.entry_hash) {
      return {
        valid: false,
        count: rows.length,
        brokenAt: { index: i, id: row.id, reason: 'entry_hash_mismatch' },
      };
    }
    // The one field an attacker cannot forge without the private key.
    const payload = buildSignedPayload({
      sub: row.sub,
      signerName: row.signer_name,
      docHash: row.doc_hash,
      createdAt: row.created_at,
    });
    if (!verifyPayload(publicKey, payload, row.signature)) {
      return {
        valid: false,
        count: rows.length,
        brokenAt: { index: i, id: row.id, reason: 'signature_invalid' },
      };
    }
    prev = row.entry_hash;
  }
  return { valid: true, count: rows.length };
}

/** Convenience: read the whole log from a DB and verify it. */
export function verifyChainFromDb(db: DB, publicKey: KeyObject): ChainVerificationResult {
  return verifyChain(allSigningLog(db), publicKey);
}
