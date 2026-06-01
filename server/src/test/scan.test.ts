import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { UploadScanner } from '../antivirus.js';
import { openDb, type DB } from '../db.js';
import { type SigningKeyPair } from '../crypto.js';
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
let token: string;
let signingKey: SigningKeyPair;

beforeEach(async () => {
  db = openDb(':memory:');
  jwks = await createTestJwks();
  signingKey = makeSigningKey();
  token = await jwks.mintToken({ sub: 'user-abc', name: 'Erika Mustermann' });
});

function build(scanUpload?: UploadScanner) {
  return createApp({
    db,
    verifier: jwks.verifier,
    signingKey,
    corsOrigin: 'http://localhost:5173',
    adminGroup: 'uav-admins',
    scanUpload,
  });
}

describe('POST /verify is public (no auth required)', () => {
  it('verifies an unknown PDF without an Authorization header', async () => {
    const app = build();
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: fakePdf('never-signed'),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { valid: boolean }).toEqual({ valid: false });
  });
});

describe('upload virus scanning', () => {
  const cleanScanner: UploadScanner = async () => ({ clean: true });
  const infectedScanner: UploadScanner = async () => ({ clean: false, signature: 'Eicar-Test-Signature' });
  const brokenScanner: UploadScanner = async () => {
    throw new Error('clamd down');
  };

  it('rejects an infected upload on the public /verify with 422', async () => {
    const app = build(infectedScanner);
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: fakePdf('eicar'),
    });
    expect(res.status).toBe(422);
    expect((await res.json()) as { error: string }).toEqual({ error: 'malware_detected' });
  });

  it('rejects an infected upload on the authenticated /sign with 422', async () => {
    const app = build(infectedScanner);
    const res = await app.request('/sign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
      body: fakePdf('eicar'),
    });
    expect(res.status).toBe(422);
    expect((await res.json()) as { error: string }).toEqual({ error: 'malware_detected' });
  });

  it('fails closed with 503 when the scanner is unreachable', async () => {
    const app = build(brokenScanner);
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: fakePdf('whatever'),
    });
    expect(res.status).toBe(503);
    expect((await res.json()) as { error: string }).toEqual({ error: 'scanner_unavailable' });
  });

  it('passes a clean upload through to normal processing', async () => {
    const app = build(cleanScanner);
    const res = await app.request('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: fakePdf('clean-doc'),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { valid: boolean }).toEqual({ valid: false });
  });
});
