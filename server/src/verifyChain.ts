import { computeEntryHash, GENESIS_PREV_HASH } from './crypto.js';
import { allSigningLog, type DB, type SigningLogRow } from './db.js';

export interface ChainVerificationResult {
  valid: boolean;
  count: number;
  /** Populated when `valid` is false: the first broken row + reason. */
  brokenAt?: {
    index: number;
    id: string;
    reason: 'prev_hash_mismatch' | 'entry_hash_mismatch';
  };
}

/**
 * Walk the signing_log in append order and assert the hash chain is intact.
 *
 * For each row i:
 *  - row.prev_entry_hash MUST equal the previous row's entry_hash
 *    (or GENESIS_PREV_HASH for the first row).
 *  - row.entry_hash MUST equal the recomputed SHA-256 over the same fields.
 *
 * Any tampering with id/sub/created_at/doc_hash/signature, or a deleted /
 * reordered row, breaks one of these checks.
 */
export function verifyChain(rows: SigningLogRow[]): ChainVerificationResult {
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
    prev = row.entry_hash;
  }
  return { valid: true, count: rows.length };
}

/** Convenience: read the whole log from a DB and verify it. */
export function verifyChainFromDb(db: DB): ChainVerificationResult {
  return verifyChain(allSigningLog(db));
}
