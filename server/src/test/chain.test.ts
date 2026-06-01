import { createPublicKey, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildSignedPayload, computeEntryHash, signPayload } from '../crypto.js';
import { appendSigningLog, allSigningLog, lastEntryHash, openDb, type DB } from '../db.js';
import { verifyChain, verifyChainFromDb } from '../verifyChain.js';

const { privateKey } = generateKeyPairSync('ed25519');
const publicKey: KeyObject = createPublicKey(privateKey);

/** Seed `n` rows with REAL Ed25519 signatures over the canonical payload. */
function seed(db: ReturnType<typeof openDb>, n: number) {
  for (let i = 0; i < n; i++) {
    const sub = `user-${i}`;
    const signerName = `User ${i}`;
    const createdAt = new Date(1_700_000_000_000 + i * 1000).toISOString();
    const docHash = `hash-${i}`.padEnd(64, '0');
    const signature = signPayload(
      privateKey,
      buildSignedPayload({ sub, signerName, docHash, createdAt }),
    );
    appendSigningLog(db, { id: `id-${i}`, sub, signerName, createdAt, docHash, signature });
  }
}

describe('hash-chain integrity', () => {
  it('verifies an intact chain', () => {
    const db = openDb(':memory:');
    seed(db, 5);
    const result = verifyChainFromDb(db, publicKey);
    expect(result.valid).toBe(true);
    expect(result.count).toBe(5);
  });

  it('links each entry to the previous entry_hash', () => {
    const db = openDb(':memory:');
    seed(db, 3);
    const rows = allSigningLog(db);
    expect(rows[1]!.prev_entry_hash).toBe(rows[0]!.entry_hash);
    expect(rows[2]!.prev_entry_hash).toBe(rows[1]!.entry_hash);
  });

  it('detects tampering with a signed field (sub) — entry_hash mismatch', () => {
    const db = openDb(':memory:');
    seed(db, 4);
    // Tamper directly in storage: change the sub of row index 2.
    db.prepare('UPDATE signing_log SET sub = ? WHERE id = ?').run('attacker', 'id-2');
    const result = verifyChainFromDb(db, publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.index).toBe(2);
    expect(result.brokenAt?.reason).toBe('entry_hash_mismatch');
  });

  it('detects tampering with doc_hash', () => {
    const db = openDb(':memory:');
    seed(db, 3);
    db.prepare('UPDATE signing_log SET doc_hash = ? WHERE id = ?').run('x'.repeat(64), 'id-1');
    const result = verifyChainFromDb(db, publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('entry_hash_mismatch');
  });

  it('detects a deleted middle row — prev_hash mismatch', () => {
    const db = openDb(':memory:');
    seed(db, 5);
    db.prepare('DELETE FROM signing_log WHERE id = ?').run('id-2');
    const result = verifyChainFromDb(db, publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('prev_hash_mismatch');
  });

  it('detects entry_hash forgery that is internally consistent but breaks the next link', () => {
    const db = openDb(':memory:');
    seed(db, 3);
    // Forge entry_hash of row 0 only — its own recompute now fails first.
    db.prepare('UPDATE signing_log SET entry_hash = ? WHERE id = ?').run('f'.repeat(64), 'id-0');
    const result = verifyChain(allSigningLog(db), publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.index).toBe(0);
  });

  it('rejects a forged row whose entry_hash is recomputed but signature is bogus', () => {
    const db = openDb(':memory:');
    // Insert ONE row directly (no key needed): the attacker controls every
    // column and recomputes a consistent entry_hash, but cannot produce a
    // valid Ed25519 signature. verifyChain must catch the bogus signature.
    insertRowRaw(db, {
      id: 'forged-0',
      sub: 'attacker',
      signer_name: 'Mallory',
      created_at: new Date().toISOString(),
      doc_hash: 'a'.repeat(64),
      signature: Buffer.from('garbage-signature').toString('base64'),
    });
    const result = verifyChainFromDb(db, publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.index).toBe(0);
    expect(result.brokenAt?.reason).toBe('signature_invalid');
  });

  it('treats an empty log as valid', () => {
    const db = openDb(':memory:');
    expect(verifyChainFromDb(db, publicKey).valid).toBe(true);
  });
});

/**
 * Insert a fully attacker-controlled row with an INTERNALLY CONSISTENT
 * entry_hash (the algorithm is public and key-less). Mirrors a DB-write
 * attacker who can recompute the chain but not the Ed25519 signature.
 */
function insertRowRaw(
  db: DB,
  fields: {
    id: string;
    sub: string;
    signer_name: string;
    created_at: string;
    doc_hash: string;
    signature: string;
  },
) {
  const prevEntryHash = lastEntryHash(db);
  const entryHash = computeEntryHash({
    prevEntryHash,
    id: fields.id,
    sub: fields.sub,
    createdAt: fields.created_at,
    docHash: fields.doc_hash,
    signature: fields.signature,
  });
  const seq = (
    db.prepare('SELECT COALESCE(MAX(rowseq), 0) AS m FROM signing_log').get() as { m: number }
  ).m + 1;
  db.prepare(
    `INSERT INTO signing_log
      (id, sub, signer_name, created_at, doc_hash, signature, prev_entry_hash, entry_hash, rowseq)
     VALUES (@id, @sub, @signer_name, @created_at, @doc_hash, @signature, @prev_entry_hash, @entry_hash, @rowseq)`,
  ).run({
    id: fields.id,
    sub: fields.sub,
    signer_name: fields.signer_name,
    created_at: fields.created_at,
    doc_hash: fields.doc_hash,
    signature: fields.signature,
    prev_entry_hash: prevEntryHash,
    entry_hash: entryHash,
    rowseq: seq,
  });
}
