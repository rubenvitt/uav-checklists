import { describe, expect, it } from 'vitest';
import { appendSigningLog, allSigningLog, openDb } from '../db.js';
import { verifyChain, verifyChainFromDb } from '../verifyChain.js';

function seed(db: ReturnType<typeof openDb>, n: number) {
  for (let i = 0; i < n; i++) {
    appendSigningLog(db, {
      id: `id-${i}`,
      sub: `user-${i}`,
      signerName: `User ${i}`,
      createdAt: new Date(1_700_000_000_000 + i * 1000).toISOString(),
      docHash: `hash-${i}`.padEnd(64, '0'),
      signature: `sig-${i}`,
    });
  }
}

describe('hash-chain integrity', () => {
  it('verifies an intact chain', () => {
    const db = openDb(':memory:');
    seed(db, 5);
    const result = verifyChainFromDb(db);
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
    const result = verifyChainFromDb(db);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.index).toBe(2);
    expect(result.brokenAt?.reason).toBe('entry_hash_mismatch');
  });

  it('detects tampering with doc_hash', () => {
    const db = openDb(':memory:');
    seed(db, 3);
    db.prepare('UPDATE signing_log SET doc_hash = ? WHERE id = ?').run('x'.repeat(64), 'id-1');
    const result = verifyChainFromDb(db);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('entry_hash_mismatch');
  });

  it('detects a deleted middle row — prev_hash mismatch', () => {
    const db = openDb(':memory:');
    seed(db, 5);
    db.prepare('DELETE FROM signing_log WHERE id = ?').run('id-2');
    const result = verifyChainFromDb(db);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('prev_hash_mismatch');
  });

  it('detects entry_hash forgery that is internally consistent but breaks the next link', () => {
    const db = openDb(':memory:');
    seed(db, 3);
    // Forge entry_hash of row 0 only — its own recompute now fails first.
    db.prepare('UPDATE signing_log SET entry_hash = ? WHERE id = ?').run('f'.repeat(64), 'id-0');
    const result = verifyChain(allSigningLog(db));
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.index).toBe(0);
  });

  it('treats an empty log as valid', () => {
    const db = openDb(':memory:');
    expect(verifyChainFromDb(db).valid).toBe(true);
  });
});
