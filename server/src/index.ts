import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createClamavScanner } from './antivirus.js';
import { createJwksVerifier, withUserinfo } from './auth.js';
import { loadConfig } from './config.js';
import { loadOrCreateSigningKey } from './crypto.js';
import { openDb } from './db.js';

function main(): void {
  const config = loadConfig();

  const db = openDb(config.dbPath);
  const signingKey = loadOrCreateSigningKey(config.signingKeyPath);
  const verifier = withUserinfo(
    createJwksVerifier({
      issuer: config.oidcIssuer,
      audience: config.oidcAudience,
      jwksUrl: config.oidcJwksUrl,
    }),
    { userinfoUrl: config.oidcUserinfoUrl },
  );

  const scanUpload = config.clamavHost
    ? createClamavScanner(config.clamavHost, config.clamavPort)
    : undefined;

  const app = createApp({
    db,
    verifier,
    signingKey,
    corsOrigin: config.corsOrigin,
    archiveDir: config.archiveDir,
    adminGroup: config.adminGroup,
    scanUpload,
  });

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(
      `[server] signature backend listening on :${info.port}\n` +
        `[server] OIDC issuer: ${config.oidcIssuer}\n` +
        `[server] CORS origin: ${config.corsOrigin}\n` +
        `[server] virus scan: ${config.clamavHost ? `clamd ${config.clamavHost}:${config.clamavPort}` : 'disabled'}\n` +
        `[server] DB: ${config.dbPath}`,
    );
  });
}

main();
