import { type KeyObject } from 'node:crypto';
import { buildAuditPayload, computeAuditEntryHash, GENESIS_PREV_HASH, verifyPayload } from './crypto.js';
import { allAuditLog, type AuditLogRow, type DB } from './db.js';

export interface AuditChainVerificationResult {
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
 * Walk the audit_log in append order and assert the hash chain is intact.
 *
 * Mirrors {@link verifyChain} for the document-signing log: hash-chain checks
 * detect deletion/reordering/field tampering, and the Ed25519 `signature` (over
 * the canonical audit payload, including `admin_name` and `reason`) is the one
 * thing an attacker with DB write access cannot forge without the private key.
 * The `publicKey` is therefore REQUIRED.
 */
export function verifyAuditChain(
  rows: AuditLogRow[],
  publicKey: KeyObject,
): AuditChainVerificationResult {
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
    const recomputed = computeAuditEntryHash({
      prevEntryHash: row.prev_entry_hash,
      id: row.id,
      action: row.action,
      docHash: row.doc_hash,
      adminSub: row.admin_sub,
      createdAt: row.created_at,
      signature: row.signature,
    });
    if (recomputed !== row.entry_hash) {
      return {
        valid: false,
        count: rows.length,
        brokenAt: { index: i, id: row.id, reason: 'entry_hash_mismatch' },
      };
    }
    const payload = buildAuditPayload({
      action: row.action,
      docHash: row.doc_hash,
      adminSub: row.admin_sub,
      adminName: row.admin_name,
      reason: row.reason,
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

/** Convenience: read the whole audit log from a DB and verify it. */
export function verifyAuditChainFromDb(db: DB, publicKey: KeyObject): AuditChainVerificationResult {
  return verifyAuditChain(allAuditLog(db), publicKey);
}
