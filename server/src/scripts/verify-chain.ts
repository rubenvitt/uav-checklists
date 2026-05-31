/**
 * CLI: walk the signing_log of the on-disk SQLite DB and assert the hash chain
 * is intact. Exits 0 when valid, 1 when broken or on error.
 *
 *   pnpm verify-chain            # uses DB_PATH from env / .env (default ./data/signatures.db)
 *   tsx src/scripts/verify-chain.ts /path/to/signatures.db
 */
import { loadConfig } from '../config.js';
import { allSigningLog, openDb } from '../db.js';
import { verifyChain } from '../verifyChain.js';

function resolveDbPath(): string {
  const arg = process.argv[2];
  if (arg) return arg;
  try {
    return loadConfig().dbPath;
  } catch {
    return process.env.DB_PATH ?? './data/signatures.db';
  }
}

function main(): void {
  const dbPath = resolveDbPath();
  const db = openDb(dbPath);
  const rows = allSigningLog(db);
  const result = verifyChain(rows);

  if (result.valid) {
    // eslint-disable-next-line no-console
    console.log(`OK  Hash chain intact: ${result.count} entr${result.count === 1 ? 'y' : 'ies'} in ${dbPath}`);
    process.exit(0);
  }

  const broken = result.brokenAt;
  // eslint-disable-next-line no-console
  console.error(
    `FAIL  Hash chain BROKEN in ${dbPath}\n` +
      (broken
        ? `      first broken row: index=${broken.index} id=${broken.id} reason=${broken.reason}`
        : `      reason unknown`),
  );
  process.exit(1);
}

main();
