import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

export interface AuthenticatedUser {
  sub: string;
  /** Resolved display name (real name when userinfo is available, else sub). */
  name: string;
  /** OIDC groups (empty when not granted / userinfo unavailable). */
  groups: string[];
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
 *
 * This verifier is intentionally network-free: it only validates the JWT and
 * extracts the claims the token actually carries (`sub`, plus a best-effort
 * name if the token happens to include one). The user's real name + groups are
 * resolved separately via {@link withUserinfo}, which calls the OIDC userinfo
 * endpoint.
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
  // Best-effort name from the token itself; the PocketID access token only
  // carries `sub`, so this typically falls through to `sub` and is replaced by
  // the userinfo-resolved name in `withUserinfo`.
  const name =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload['preferred_username'] === 'string' && payload['preferred_username']) ||
    (typeof payload['email'] === 'string' && payload['email']) ||
    sub;
  const groups = Array.isArray(payload['groups'])
    ? (payload['groups'].filter((g) => typeof g === 'string') as string[])
    : [];
  return { sub, name: name as string, groups };
}

/** Shape of the relevant fields of an OIDC userinfo response. */
interface UserinfoResponse {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  groups?: unknown;
}

/**
 * Resolve the display name from a userinfo response using the preference order
 * name -> "given_name family_name" -> preferred_username -> email -> sub.
 */
export function resolveUserinfoName(info: UserinfoResponse, sub: string): string {
  if (typeof info.name === 'string' && info.name.trim() !== '') {
    return info.name;
  }
  if (
    typeof info.given_name === 'string' &&
    info.given_name.trim() !== '' &&
    typeof info.family_name === 'string' &&
    info.family_name.trim() !== ''
  ) {
    return `${info.given_name} ${info.family_name}`;
  }
  if (typeof info.preferred_username === 'string' && info.preferred_username.trim() !== '') {
    return info.preferred_username;
  }
  if (typeof info.email === 'string' && info.email.trim() !== '') {
    return info.email;
  }
  return sub;
}

function resolveUserinfoGroups(info: UserinfoResponse): string[] {
  return Array.isArray(info.groups)
    ? (info.groups.filter((g) => typeof g === 'string') as string[])
    : [];
}

export interface UserinfoOptions {
  /** OIDC userinfo endpoint URL. */
  userinfoUrl: string;
  /** Cache TTL in milliseconds (default 5 minutes). */
  ttlMs?: number;
  /** Injectable fetch (defaults to global fetch); handy for tests. */
  fetchImpl?: typeof fetch;
}

/** Cached userinfo enrichment (name + groups), keyed by access token. */
interface CacheEntry {
  name: string;
  groups: string[];
  expiresAt: number;
}

/**
 * Wrap a base {@link TokenVerifier} so that, after JWT validation, it enriches
 * the user with the real name + groups from the OIDC userinfo endpoint using
 * the SAME bearer token.
 *
 * IMPORTANT: the JWT is validated on EVERY request via `base.verify(token)`
 * (so signature / iss / aud / exp are always re-checked — JWKS keys are cached
 * by jose, so this is cheap). Only the userinfo *enrichment* is cached, keyed
 * by token with a short TTL, to avoid calling userinfo on every request. On any
 * userinfo failure it falls back to (name = sub, groups = []) and does NOT
 * cache that failure, so a transient blip self-heals on the next request.
 */
export function withUserinfo(base: TokenVerifier, opts: UserinfoOptions): TokenVerifier {
  const ttlMs = opts.ttlMs ?? 5 * 60 * 1000;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const cache = new Map<string, CacheEntry>();

  return {
    async verify(token: string): Promise<AuthenticatedUser> {
      // Always validate the JWT first — an invalid/expired token must reject
      // even when a userinfo enrichment is still cached for that token.
      const baseUser = await base.verify(token);

      const cached = cache.get(token);
      if (cached && cached.expiresAt > Date.now()) {
        return { sub: baseUser.sub, name: cached.name, groups: cached.groups };
      }
      // Drop a stale entry eagerly so the Map does not accumulate dead tokens.
      if (cached) cache.delete(token);

      try {
        const res = await fetchImpl(opts.userinfoUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.ok) {
          const info = (await res.json()) as UserinfoResponse;
          const name = resolveUserinfoName(info, baseUser.sub);
          const groups = resolveUserinfoGroups(info);
          cache.set(token, { name, groups, expiresAt: Date.now() + ttlMs });
          return { sub: baseUser.sub, name, groups };
        }
      } catch {
        // Network / parse failure — fall through to the base fallback below.
      }

      // Userinfo unavailable: fall back to (sub, []) WITHOUT caching the
      // failure, so the next request retries.
      return { sub: baseUser.sub, name: baseUser.sub, groups: [] };
    },
  };
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

/**
 * Returns true iff the authenticated user belongs to the configured admin
 * group.
 */
export function isAdmin(user: AuthenticatedUser, adminGroup: string): boolean {
  return user.groups.includes(adminGroup);
}

/**
 * Middleware that 403s any authenticated user who is not in the admin group.
 * Must run AFTER {@link authMiddleware} (it reads the resolved user from ctx).
 */
export function adminOnly(adminGroup: string): MiddlewareHandler {
  return async (c, next) => {
    const user = getUser(c);
    if (!user || !isAdmin(user, adminGroup)) {
      return c.json({ error: 'forbidden' }, 403);
    }
    await next();
  };
}
