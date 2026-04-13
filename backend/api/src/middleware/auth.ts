import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { config } from '../lib/config.js';
import type { AppEnv } from '../lib/types.js';

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!cachedJwks) {
    const url = new URL(
      '/.well-known/jwks.json',
      config.OIDC_ISSUER,
    );
    cachedJwks = jose.createRemoteJWKSet(url);
  }
  return cachedJwks;
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  // Dev-mode bypass: skip auth when OIDC_ISSUER is not configured
  if (!config.OIDC_ISSUER) {
    c.set('user', { name: 'Dev User', email: 'dev@localhost' });
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const jwks = getJwks();
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: config.OIDC_ISSUER,
      audience: config.OIDC_CLIENT_ID,
    });

    const name =
      (payload.name as string) ??
      (payload.preferred_username as string) ??
      'Unknown';
    const email = (payload.email as string) ?? '';

    c.set('user', { name, email });
    return next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
