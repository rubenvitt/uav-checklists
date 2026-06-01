import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildSignedPayload, sha256Hex, signPayload, verifyPayload } from '../crypto.js';

describe('Ed25519 sign/verify with sub-bound payload', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const publicKey = createPublicKey(privateKey);

  it('round-trips a signature over (sub, signerName, docHash, createdAt)', () => {
    const docHash = sha256Hex(Buffer.from('the pdf bytes'));
    const createdAt = new Date().toISOString();
    const payload = buildSignedPayload({
      sub: 'user-1',
      signerName: 'Erika',
      docHash,
      createdAt,
    });
    const sig = signPayload(privateKey, payload);
    expect(verifyPayload(publicKey, payload, sig)).toBe(true);
  });

  it('fails verification if the sub is changed (identity is bound)', () => {
    const docHash = sha256Hex(Buffer.from('pdf'));
    const createdAt = new Date().toISOString();
    const sig = signPayload(
      privateKey,
      buildSignedPayload({ sub: 'user-1', signerName: 'Erika', docHash, createdAt }),
    );
    const forged = buildSignedPayload({ sub: 'user-2', signerName: 'Erika', docHash, createdAt });
    expect(verifyPayload(publicKey, forged, sig)).toBe(false);
  });

  it('fails verification if the signerName is changed (name is bound)', () => {
    const docHash = sha256Hex(Buffer.from('pdf'));
    const createdAt = new Date().toISOString();
    const sig = signPayload(
      privateKey,
      buildSignedPayload({ sub: 'u', signerName: 'Erika', docHash, createdAt }),
    );
    const forged = buildSignedPayload({ sub: 'u', signerName: 'Mallory', docHash, createdAt });
    expect(verifyPayload(publicKey, forged, sig)).toBe(false);
  });

  it('fails verification if the docHash is changed', () => {
    const createdAt = new Date().toISOString();
    const sig = signPayload(
      privateKey,
      buildSignedPayload({ sub: 'u', signerName: 'Erika', docHash: 'a'.repeat(64), createdAt }),
    );
    const forged = buildSignedPayload({
      sub: 'u',
      signerName: 'Erika',
      docHash: 'b'.repeat(64),
      createdAt,
    });
    expect(verifyPayload(publicKey, forged, sig)).toBe(false);
  });

  it('produces a stable SHA-256 hex hash', () => {
    expect(sha256Hex(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
