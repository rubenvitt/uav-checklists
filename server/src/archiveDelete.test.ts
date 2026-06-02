import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from './app.js';
import type { AuthenticatedUser, TokenVerifier } from './auth.js';
import { sha256Hex, type SigningKeyPair } from './crypto.js';
import { allAuditLog, allSigningLog, openDb, type DB } from './db.js';
import { verifyAuditChain } from './verifyAuditChain.js';
import { verifyChain } from './verifyChain.js';

function makeSigningKey(): SigningKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

const ADMIN: AuthenticatedUser = { sub: 'admin-sub', name: 'Admin Adminson', groups: ['uav-admins'] };
const USER: AuthenticatedUser = { sub: 'user-sub', name: 'Normal Nutzer', groups: ['pilots'] };

const fakeVerifier: TokenVerifier = {
  async verify(token: string): Promise<AuthenticatedUser> {
    if (token === 'admin-token') return ADMIN;
    if (token === 'user-token') return USER;
    throw new Error('invalid');
  },
};

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

describe('archive soft-delete / restore / purge + signed audit log', () => {
  let db: DB;
  let signingKey: SigningKeyPair;
  let app: ReturnType<typeof createApp>;
  let archiveDir: string;

  beforeEach(() => {
    db = openDb(':memory:');
    signingKey = makeSigningKey();
    archiveDir = mkdtempSync(join(tmpdir(), 'uav-archive-test-'));
    const deps: AppDeps = {
      db,
      verifier: fakeVerifier,
      signingKey,
      corsOrigin: 'http://localhost:5174',
      adminGroup: 'uav-admins',
      archiveDir,
    };
    app = createApp(deps);
  });

  /** Sign a PDF as USER and archive it, returning its doc hash. */
  async function signAndArchive(pdf: Buffer, filename?: string): Promise<string> {
    const signRes = await app.request('/sign', {
      method: 'POST',
      headers: { ...bearer('user-token'), 'Content-Type': 'application/pdf' },
      body: pdf,
    });
    expect(signRes.status).toBe(201);
    const headers: Record<string, string> = { ...bearer('user-token'), 'Content-Type': 'application/pdf' };
    if (filename) headers['X-Filename'] = filename;
    const archRes = await app.request('/archive', { method: 'POST', headers, body: pdf });
    expect(archRes.status).toBe(201);
    return sha256Hex(pdf);
  }

  it('admin soft-deletes: entry leaves /archive, appears in /archive/deleted', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 soft'), 'einsatz.pdf');

    const del = await app.request(`/archive/${hash}`, {
      method: 'DELETE',
      headers: { ...bearer('admin-token'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Doppelt erfasst' }),
    });
    expect(del.status).toBe(200);

    const active = (await (await app.request('/archive', { headers: bearer('admin-token') })).json()) as unknown[];
    expect(active).toHaveLength(0);

    const deleted = (await (await app.request('/archive/deleted', { headers: bearer('admin-token') })).json()) as Array<
      Record<string, unknown>
    >;
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatchObject({ docHash: hash, reason: 'Doppelt erfasst' });
    expect(typeof deleted[0]!.deletedAt).toBe('string');
  });

  it('soft-delete leaves signing_log + /verify intact (no erasure of the registry)', async () => {
    const pdf = Buffer.from('%PDF-1.4 registry');
    const hash = await signAndArchive(pdf);

    await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });

    // The signing registry row is untouched and the chain still verifies.
    expect(allSigningLog(db)).toHaveLength(1);
    expect(verifyChain(allSigningLog(db), signingKey.publicKey).valid).toBe(true);

    // A held copy of the PDF still verifies as registered.
    const verify = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdf,
    });
    expect(verify.status).toBe(200);
    expect(await verify.json()).toMatchObject({ valid: true, docHash: hash });
  });

  it('records a signed, hash-chained audit entry for the deletion', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 audit'));
    await app.request(`/archive/${hash}`, {
      method: 'DELETE',
      headers: { ...bearer('admin-token'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Testgrund' }),
    });

    const rows = allAuditLog(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'archive_delete',
      doc_hash: hash,
      admin_sub: 'admin-sub',
      admin_name: 'Admin Adminson',
      reason: 'Testgrund',
    });
    // The audit chain is intact and each entry is a valid Ed25519 signature.
    expect(verifyAuditChain(rows, signingKey.publicKey).valid).toBe(true);
  });

  it('non-admin cannot delete (403) and writes no audit entry', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 forbidden'));
    const res = await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('user-token') });
    expect(res.status).toBe(403);
    expect(allAuditLog(db)).toHaveLength(0);
  });

  it('deleting an unknown / already-deleted hash returns 404', async () => {
    const unknown = await app.request(`/archive/${'0'.repeat(64)}`, {
      method: 'DELETE',
      headers: bearer('admin-token'),
    });
    expect(unknown.status).toBe(404);

    const hash = await signAndArchive(Buffer.from('%PDF-1.4 twice'));
    await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });
    const again = await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });
    expect(again.status).toBe(404);
  });

  it('restore brings a soft-deleted entry back and logs archive_restore', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 restore'), 'r.pdf');
    await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });

    const res = await app.request(`/archive/${hash}/restore`, { method: 'POST', headers: bearer('admin-token') });
    expect(res.status).toBe(200);

    const active = (await (await app.request('/archive', { headers: bearer('admin-token') })).json()) as unknown[];
    expect(active).toHaveLength(1);
    const deleted = (await (await app.request('/archive/deleted', { headers: bearer('admin-token') })).json()) as unknown[];
    expect(deleted).toHaveLength(0);

    const rows = allAuditLog(db);
    expect(rows.map((r) => r.action)).toEqual(['archive_delete', 'archive_restore']);
    expect(verifyAuditChain(rows, signingKey.publicKey).valid).toBe(true);
  });

  it('restoring an entry that is not soft-deleted returns 404', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 norestore'));
    const res = await app.request(`/archive/${hash}/restore`, { method: 'POST', headers: bearer('admin-token') });
    expect(res.status).toBe(404);
  });

  it('permanent delete removes the row + on-disk file, keeps signing_log, logs archive_purge', async () => {
    const pdf = Buffer.from('%PDF-1.4 purge');
    const hash = await signAndArchive(pdf);
    const filePath = join(archiveDir, `${hash}.pdf`);
    expect(existsSync(filePath)).toBe(true);

    // Must be soft-deleted first (purge only operates on the recycle bin).
    await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });

    const res = await app.request(`/archive/${hash}/permanent`, { method: 'DELETE', headers: bearer('admin-token') });
    expect(res.status).toBe(200);

    expect(existsSync(filePath)).toBe(false);
    const deleted = (await (await app.request('/archive/deleted', { headers: bearer('admin-token') })).json()) as unknown[];
    expect(deleted).toHaveLength(0);

    // Registry is still intact — only the archived copy is gone.
    expect(allSigningLog(db)).toHaveLength(1);
    expect(verifyChain(allSigningLog(db), signingKey.publicKey).valid).toBe(true);

    const rows = allAuditLog(db);
    expect(rows.map((r) => r.action)).toEqual(['archive_delete', 'archive_purge']);
    expect(verifyAuditChain(rows, signingKey.publicKey).valid).toBe(true);
  });

  it('permanent delete of an entry that is not soft-deleted returns 409', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 directpurge'));
    const res = await app.request(`/archive/${hash}/permanent`, { method: 'DELETE', headers: bearer('admin-token') });
    expect(res.status).toBe(409);
  });

  it('a soft-deleted entry is not downloadable until restored (404)', async () => {
    const pdf = Buffer.from('%PDF-1.4 hidden')
    const hash = await signAndArchive(pdf)
    await app.request(`/archive/${hash}`, { method: 'DELETE', headers: bearer('admin-token') });

    // Both the admin and the original signer get 404 while it sits in the bin.
    expect((await app.request(`/archive/${hash}`, { headers: bearer('admin-token') })).status).toBe(404);
    expect((await app.request(`/archive/${hash}`, { headers: bearer('user-token') })).status).toBe(404);

    // After restore it downloads again.
    await app.request(`/archive/${hash}/restore`, { method: 'POST', headers: bearer('admin-token') });
    const back = await app.request(`/archive/${hash}`, { headers: bearer('admin-token') });
    expect(back.status).toBe(200);
    expect(Buffer.from(await back.arrayBuffer()).equals(pdf)).toBe(true);
  });

  it('non-admin gets 403 on /archive/deleted', async () => {
    const res = await app.request('/archive/deleted', { headers: bearer('user-token') });
    expect(res.status).toBe(403);
  });
});
