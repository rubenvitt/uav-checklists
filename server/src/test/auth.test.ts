import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { authMiddleware, getUser } from '../auth.js';
import { createTestJwks, TEST_AUDIENCE, TEST_ISSUER } from './helpers.js';

/** Minimal app exposing a protected route that echoes the authenticated user. */
function protectedApp(verifier: Parameters<typeof authMiddleware>[0]) {
  const app = new Hono();
  app.get('/whoami', authMiddleware(verifier), (c) => c.json(getUser(c)));
  return app;
}

describe('auth token validation (mock JWKS)', () => {
  it('accepts a valid token and extracts sub + name', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const token = await jwks.mintToken({ sub: 's-1', name: 'Anna Admin' });

    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const user = (await res.json()) as { sub: string; name: string };
    expect(user.sub).toBe('s-1');
    expect(user.name).toBe('Anna Admin');
  });

  it('rejects a request without an Authorization header', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const res = await app.request('/whoami');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const res = await app.request('/whoami', { headers: { Authorization: 'Token abc' } });
    expect(res.status).toBe(401);
  });

  it('rejects a token signed by a different (untrusted) key', async () => {
    const trusted = await createTestJwks();
    const attacker = await createTestJwks();
    const app = protectedApp(trusted.verifier);
    const forged = await attacker.mintToken({ sub: 'evil', name: 'Mallory' });

    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${forged}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects a token with the wrong audience', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const token = await jwks.mintToken({ sub: 's-2', audience: 'some-other-api' });
    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects a token with the wrong issuer', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const token = await jwks.mintToken({ sub: 's-3', issuer: 'https://evil.example' });
    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const jwks = await createTestJwks();
    const app = protectedApp(jwks.verifier);
    const token = await jwks.mintToken({ sub: 's-4', expiresIn: '-1m' });
    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  // Sanity check that the test constants are used (documents the contract).
  it('uses the documented issuer/audience', () => {
    expect(TEST_ISSUER).toMatch(/^https:\/\//);
    expect(TEST_AUDIENCE.length).toBeGreaterThan(0);
  });
});
