/**
 * CLI: walk the signing_log of the on-disk SQLite DB and assert the hash chain
 * is intact. Exits 0 when valid, 1 when broken or on error.
 *
 *   pnpm verify-chain            # uses DB_PATH from env / .env (default ./data/signatures.db)
 *   tsx src/scripts/verify-chain.ts /path/to/signatures.db
 */
import { loadConfig } from '../config.js';
import { loadOrCreateSigningKey } from '../crypto.js';
import { allSigningLog, openDb } from '../db.js';
import { verifyChain } from '../verifyChain.js';

interface ResolvedPaths {
  dbPath: string;
  signingKeyPath: string;
}

function resolvePaths(): ResolvedPaths {
  const arg = process.argv[2];
  try {
    const config = loadConfig();
    return { dbPath: arg ?? config.dbPath, signingKeyPath: config.signingKeyPath };
  } catch {
    return {
      dbPath: arg ?? process.env.DB_PATH ?? './data/signatures.db',
      signingKeyPath: process.env.SIGNING_KEY_PATH ?? './data/signing-key.pem',
    };
  }
}

function main(): void {
  const { dbPath, signingKeyPath } = resolvePaths();
  const db = openDb(dbPath);
  // The public key is required to verify each row's Ed25519 signature.
  const { publicKey } = loadOrCreateSigningKey(signingKeyPath);
  const rows = allSigningLog(db);
  const result = verifyChain(rows, publicKey);

  if (result.valid) {
    console.log(`OK  Hash chain intact: ${result.count} entr${result.count === 1 ? 'y' : 'ies'} in ${dbPath}`);
    process.exit(0);
  }

  const broken = result.brokenAt;
  console.error(
    `FAIL  Hash chain BROKEN in ${dbPath}\n` +
      (broken
        ? `      first broken row: index=${broken.index} id=${broken.id} reason=${broken.reason}`
        : `      reason unknown`),
  );
  process.exit(1);
}

main();
