import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { openDb, type DB } from '../db.js';
import { verifyChainFromDb } from '../verifyChain.js';
import type { SigningKeyPair } from '../crypto.js';
import { createPublicKey } from 'node:crypto';
import { createTestJwks, fakePdf, type TestJwksContext } from './helpers.js';

function makeSigningKey(): SigningKeyPair {
  const { privateKey } = generateKeyPairSync('ed25519');
  const publicKey = createPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

let db: DB;
let jwks: TestJwksContext;
let app: ReturnType<typeof createApp>;
let token: string;

beforeEach(async () => {
  db = openDb(':memory:');
  jwks = await createTestJwks();
  app = createApp({
    db,
    verifier: jwks.verifier,
    signingKey: makeSigningKey(),
    corsOrigin: 'http://localhost:5173',
  });
  token = await jwks.mintToken({ sub: 'user-abc', name: 'Erika Mustermann' });
});

function authed(path: string, body: Buffer, method = 'POST') {
  return app.request(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
    body,
  });
}

describe('POST /sign + POST /verify round-trip', () => {
  it('signs a PDF and verifies it as valid with bound signer', async () => {
    const pdf = fakePdf('mission-report-1');

    const signRes = await authed('/sign', pdf);
    expect(signRes.status).toBe(201);
    const receipt = (await signRes.json()) as {
      id: string;
      signer: { sub: string; name: string };
      docHash: string;
      signature: string;
      createdAt: string;
    };
    expect(receipt.signer.sub).toBe('user-abc');
    expect(receipt.signer.name).toBe('Erika Mustermann');
    expect(receipt.docHash).toHaveLength(64);
    expect(receipt.signature.length).toBeGreaterThan(0);

    const verifyRes = await authed('/verify', pdf);
    expect(verifyRes.status).toBe(200);
    const verdict = (await verifyRes.json()) as {
      valid: boolean;
      signer: { sub: string; name: string };
      createdAt: string;
    };
    expect(verdict.valid).toBe(true);
    expect(verdict.signer.sub).toBe('user-abc');
    expect(verdict.createdAt).toBe(receipt.createdAt);

    // The append must have produced an intact chain.
    expect(verifyChainFromDb(db).valid).toBe(true);
  });

  it('verify rejects a modified PDF (different bytes -> different hash)', async () => {
    const original = fakePdf('original');
    await authed('/sign', original);

    const modified = fakePdf('tampered');
    const verifyRes = await authed('/verify', modified);
    expect(verifyRes.status).toBe(200);
    const verdict = (await verifyRes.json()) as { valid: boolean };
    expect(verdict.valid).toBe(false);
  });
});

describe('POST /archive gating', () => {
  it('archives only a registered (signed) PDF', async () => {
    const pdf = fakePdf('to-archive');
    await authed('/sign', pdf);
    const res = await authed('/archive', pdf);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { archived: boolean; docHash: string };
    expect(body.archived).toBe(true);
  });

  it('rejects archiving an unregistered PDF with 4xx', async () => {
    const pdf = fakePdf('never-signed');
    const res = await authed('/archive', pdf);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = (await res.json()) as { archived: boolean; reason: string };
    expect(body.archived).toBe(false);
    expect(body.reason).toBe('not_registered');
  });
});

describe('GET/PUT/DELETE /me/signature', () => {
  const PNG = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('fake-png-body'),
  ]);

  it('stores, returns, and deletes one PNG per sub', async () => {
    const get404 = await app.request('/me/signature', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(get404.status).toBe(404);

    const put = await app.request('/me/signature', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
      body: PNG,
    });
    expect(put.status).toBe(200);

    const get = await app.request('/me/signature', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(get.status).toBe(200);
    expect(get.headers.get('content-type')).toContain('image/png');
    const bytes = Buffer.from(await get.arrayBuffer());
    expect(bytes.equals(PNG)).toBe(true);

    const del = await app.request('/me/signature', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(del.status).toBe(200);

    const getAfter = await app.request('/me/signature', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getAfter.status).toBe(404);
  });

  it('rejects a non-PNG body', async () => {
    const res = await app.request('/me/signature', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
      body: Buffer.from('not a png'),
    });
    expect(res.status).toBe(415);
  });
});

describe('GET /health (unauthenticated)', () => {
  it('returns ok without a token', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; publicKey: string };
    expect(body.status).toBe('ok');
    expect(body.publicKey).toContain('BEGIN PUBLIC KEY');
  });
});
