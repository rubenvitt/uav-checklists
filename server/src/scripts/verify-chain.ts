/**
 * CLI: walk both hash chains of the on-disk SQLite DB and assert they are
 * intact — the document-signing log AND the admin-action audit log. Exits 0
 * when both are valid, 1 when either is broken or on error.
 *
 *   pnpm verify-chain            # uses DB_PATH from env / .env (default ./data/signatures.db)
 *   tsx src/scripts/verify-chain.ts /path/to/signatures.db
 */
import { type KeyObject } from 'node:crypto';
import { loadConfig } from '../config.js';
import { loadOrCreateSigningKey } from '../crypto.js';
import { allAuditLog, allSigningLog, openDb, type DB } from '../db.js';
import { verifyAuditChain } from '../verifyAuditChain.js';
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

/** Verify one named chain; print OK/FAIL and return whether it is intact. */
function checkChain(
  label: string,
  result: { valid: boolean; count: number; brokenAt?: { index: number; id: string; reason: string } },
  dbPath: string,
): boolean {
  if (result.valid) {
    console.log(`OK  ${label} intact: ${result.count} entr${result.count === 1 ? 'y' : 'ies'} in ${dbPath}`);
    return true;
  }
  const broken = result.brokenAt;
  console.error(
    `FAIL  ${label} BROKEN in ${dbPath}\n` +
      (broken
        ? `      first broken row: index=${broken.index} id=${broken.id} reason=${broken.reason}`
        : `      reason unknown`),
  );
  return false;
}

function main(): void {
  const { dbPath, signingKeyPath } = resolvePaths();
  const db: DB = openDb(dbPath);
  // The public key is required to verify each row's Ed25519 signature.
  const { publicKey }: { publicKey: KeyObject } = loadOrCreateSigningKey(signingKeyPath);

  const signingOk = checkChain('Signing chain', verifyChain(allSigningLog(db), publicKey), dbPath);
  const auditOk = checkChain('Audit chain', verifyAuditChain(allAuditLog(db), publicKey), dbPath);

  process.exit(signingOk && auditOk ? 0 : 1);
}

main();
