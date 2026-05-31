import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createJwksVerifier } from './auth.js';
import { loadConfig } from './config.js';
import { loadOrCreateSigningKey } from './crypto.js';
import { openDb } from './db.js';

function main(): void {
  const config = loadConfig();

  const db = openDb(config.dbPath);
  const signingKey = loadOrCreateSigningKey(config.signingKeyPath);
  const verifier = createJwksVerifier({
    issuer: config.oidcIssuer,
    audience: config.oidcAudience,
    jwksUrl: config.oidcJwksUrl,
  });

  const app = createApp({
    db,
    verifier,
    signingKey,
    corsOrigin: config.corsOrigin,
    archiveDir: config.archiveDir,
  });

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[server] signature backend listening on :${info.port}\n` +
        `[server] OIDC issuer: ${config.oidcIssuer}\n` +
        `[server] CORS origin: ${config.corsOrigin}\n` +
        `[server] DB: ${config.dbPath}`,
    );
  });
}

main();
