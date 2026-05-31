import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet, type JWK } from 'jose';
import { makeVerifier, type TokenVerifier } from '../auth.js';

export const TEST_ISSUER = 'https://pocketid.test';
export const TEST_AUDIENCE = 'uav-signatures';

export interface TestJwksContext {
  verifier: TokenVerifier;
  /** Mint a valid access token for the given subject/name. */
  mintToken(claims: {
    sub: string;
    name?: string;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  }): Promise<string>;
}

/**
 * Build an in-memory JWKS + verifier (no network). Mirrors how the production
 * `createJwksVerifier` validates iss/aud/exp/signature, but with a local key.
 */
export async function createTestJwks(): Promise<TestJwksContext> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk: JWK = await exportJWK(publicKey);
  publicJwk.kid = 'test-key-1';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const jwks = createLocalJWKSet({ keys: [publicJwk] });
  const verifier = makeVerifier(jwks, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE });

  async function mintToken(claims: {
    sub: string;
    name?: string;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  }): Promise<string> {
    const jwt = new SignJWT({ name: claims.name ?? 'Test User' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setSubject(claims.sub)
      .setIssuer(claims.issuer ?? TEST_ISSUER)
      .setAudience(claims.audience ?? TEST_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(claims.expiresIn ?? '5m');
    return jwt.sign(privateKey);
  }

  return { verifier, mintToken };
}

/** A tiny valid-ish PDF byte sequence for hashing/round-trip tests. */
export function fakePdf(marker: string): Buffer {
  return Buffer.from(`%PDF-1.7\n${marker}\n%%EOF\n`, 'utf8');
}
