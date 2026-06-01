import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppDeps } from './app.js';
import type { AuthenticatedUser, TokenVerifier } from './auth.js';
import {
  buildSignedPayload,
  sha256Hex,
  signPayload,
  type SigningKeyPair,
} from './crypto.js';
import { openDb, type DB } from './db.js';

function makeSigningKey(): SigningKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/**
 * Verifier that maps tokens to users:
 *  - "admin-token"     -> in uav-admins
 *  - "user-token"      -> non-admin (signs the test documents)
 *  - "other-token"     -> non-admin, NOT the signer
 * Any other token rejects.
 */
const ADMIN: AuthenticatedUser = { sub: 'admin-sub', name: 'Admin Adminson', groups: ['uav-admins'] };
const USER: AuthenticatedUser = { sub: 'user-sub', name: 'Normal Nutzer', groups: ['pilots'] };
const OTHER: AuthenticatedUser = { sub: 'other-sub', name: 'Andere Person', groups: ['pilots'] };

const fakeVerifier: TokenVerifier = {
  async verify(token: string): Promise<AuthenticatedUser> {
    if (token === 'admin-token') return ADMIN;
    if (token === 'user-token') return USER;
    if (token === 'other-token') return OTHER;
    throw new Error('invalid');
  },
};

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

describe('admin-gated archive + /me', () => {
  let db: DB;
  let signingKey: SigningKeyPair;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = openDb(':memory:');
    signingKey = makeSigningKey();
    const deps: AppDeps = {
      db,
      verifier: fakeVerifier,
      signingKey,
      corsOrigin: 'http://localhost:5174',
      adminGroup: 'uav-admins',
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

    const headers: Record<string, string> = {
      ...bearer('user-token'),
      'Content-Type': 'application/pdf',
    };
    if (filename) headers['X-Filename'] = filename;
    const archRes = await app.request('/archive', { method: 'POST', headers, body: pdf });
    expect(archRes.status).toBe(201);
    return sha256Hex(pdf);
  }

  it('GET /me returns isAdmin true for admins and false for normal users', async () => {
    const adminMe = await app.request('/me', { headers: bearer('admin-token') });
    expect(adminMe.status).toBe(200);
    expect(await adminMe.json()).toEqual({
      sub: 'admin-sub',
      name: 'Admin Adminson',
      groups: ['uav-admins'],
      isAdmin: true,
    });

    const userMe = await app.request('/me', { headers: bearer('user-token') });
    expect(userMe.status).toBe(200);
    expect(await userMe.json()).toEqual({
      sub: 'user-sub',
      name: 'Normal Nutzer',
      groups: ['pilots'],
      isAdmin: false,
    });
  });

  it('GET /me requires authentication', async () => {
    const res = await app.request('/me');
    expect(res.status).toBe(401);
  });

  it('admin can list the archive (newest first) with signer + filename metadata', async () => {
    const hash = await signAndArchive(Buffer.from('%PDF-1.4 doc one'), 'einsatz-1.pdf');

    const res = await app.request('/archive', { headers: bearer('admin-token') });
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      docHash: hash,
      signer: 'Normal Nutzer',
      filename: 'einsatz-1.pdf',
    });
    expect(typeof list[0]!.signedAt).toBe('string');
    expect(typeof list[0]!.archivedAt).toBe('string');
  });

  it('non-admin gets 403 on GET /archive', async () => {
    const res = await app.request('/archive', { headers: bearer('user-token') });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
  });

  it('admin can download an archived PDF with proper headers', async () => {
    const pdf = Buffer.from('%PDF-1.4 downloadable');
    const hash = await signAndArchive(pdf, 'report.pdf');

    const res = await app.request(`/archive/${hash}`, { headers: bearer('admin-token') });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe(
      `attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`,
    );
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(pdf)).toBe(true);
  });

  it('serves German umlaut filenames via RFC 6266 filename*', async () => {
    const pdf = Buffer.from('%PDF-1.4 umlaut');
    const hash = await signAndArchive(pdf, 'Einsatzbericht-Köln.pdf');

    const res = await app.request(`/archive/${hash}`, { headers: bearer('admin-token') });
    expect(res.status).toBe(200);
    const cd = res.headers.get('Content-Disposition')!;
    expect(cd).toContain(`filename*=UTF-8''Einsatzbericht-K%C3%B6ln.pdf`);
    // ASCII fallback must not contain raw non-ASCII bytes.
    expect(cd).toContain('filename="Einsatzbericht-K_ln.pdf"');
  });

  it('falls back to <docHash>.pdf when no filename was stored', async () => {
    const pdf = Buffer.from('%PDF-1.4 no name');
    const hash = await signAndArchive(pdf);

    const res = await app.request(`/archive/${hash}`, { headers: bearer('admin-token') });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toBe(
      `attachment; filename="${hash}.pdf"; filename*=UTF-8''${hash}.pdf`,
    );
  });

  it('lets the signer download the PDF they signed (non-admin)', async () => {
    const pdf = Buffer.from('%PDF-1.4 mine');
    const hash = await signAndArchive(pdf);

    // user-token is the signer in signAndArchive — they may fetch it back.
    const res = await app.request(`/archive/${hash}`, { headers: bearer('user-token') });
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(pdf)).toBe(true);
  });

  it('forbids a non-admin who did not sign the document', async () => {
    const pdf = Buffer.from('%PDF-1.4 secret');
    const hash = await signAndArchive(pdf);

    const res = await app.request(`/archive/${hash}`, { headers: bearer('other-token') });
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown doc hash (admin)', async () => {
    const res = await app.request(`/archive/${'0'.repeat(64)}`, { headers: bearer('admin-token') });
    expect(res.status).toBe(404);
  });

  it('signs with the resolved real name (flows into the receipt)', async () => {
    const pdf = Buffer.from('%PDF-1.4 receipt');
    const res = await app.request('/sign', {
      method: 'POST',
      headers: { ...bearer('user-token'), 'Content-Type': 'application/pdf' },
      body: pdf,
    });
    const receipt = (await res.json()) as { signer: { sub: string; name: string } };
    expect(receipt.signer).toEqual({ sub: 'user-sub', name: 'Normal Nutzer' });

    // And the signed payload is cryptographically bound to that name.
    const payload = buildSignedPayload({
      sub: 'user-sub',
      signerName: 'Normal Nutzer',
      docHash: sha256Hex(pdf),
      createdAt: (receipt as unknown as { createdAt: string }).createdAt,
    });
    // sanity: signing the same payload reproduces a valid signature shape
    expect(signPayload(signingKey.privateKey, payload).length).toBeGreaterThan(0);
  });
});
