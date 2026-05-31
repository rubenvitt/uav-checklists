import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

export interface AuthenticatedUser {
  sub: string;
  name: string;
}

/**
 * A token verifier abstracts away the JWKS source so tests can inject a local
 * key set (jose.createLocalJWKSet) instead of hitting the network.
 */
export interface TokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}

export interface JwksConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
}

/**
 * Production verifier: validates signature, `iss`, `aud`, `exp` against the
 * issuer's remote JWKS and extracts `sub` + display name.
 */
export function createJwksVerifier(config: JwksConfig): TokenVerifier {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  return makeVerifier(jwks, { issuer: config.issuer, audience: config.audience });
}

/**
 * Generic verifier over any jose key-resolver. Used by `createJwksVerifier`
 * and directly by tests with a local key set.
 */
export function makeVerifier(
  getKey: JWTVerifyGetKey,
  opts: { issuer: string; audience: string },
): TokenVerifier {
  return {
    async verify(token: string): Promise<AuthenticatedUser> {
      const { payload } = await jwtVerify(token, getKey, {
        issuer: opts.issuer,
        audience: opts.audience,
      });
      return extractUser(payload);
    },
  };
}

function extractUser(payload: JWTPayload): AuthenticatedUser {
  const sub = payload.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new Error('Token missing sub claim');
  }
  // Prefer OIDC `name`, fall back to preferred_username / email / sub.
  const name =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload['preferred_username'] === 'string' && payload['preferred_username']) ||
    (typeof payload['email'] === 'string' && payload['email']) ||
    sub;
  return { sub, name: name as string };
}

/** Hono context key under which the authenticated user is stored. */
export const USER_CTX_KEY = 'user';

export function getUser(c: Context): AuthenticatedUser {
  return c.get(USER_CTX_KEY) as AuthenticatedUser;
}

/**
 * Bearer-auth middleware. Rejects with 401 when the Authorization header is
 * missing/malformed or the token fails validation.
 */
export function authMiddleware(verifier: TokenVerifier): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'missing_bearer_token' }, 401);
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return c.json({ error: 'missing_bearer_token' }, 401);
    }
    try {
      const user = await verifier.verify(token);
      c.set(USER_CTX_KEY, user);
    } catch {
      return c.json({ error: 'invalid_token' }, 401);
    }
    await next();
  };
}
