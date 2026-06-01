import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adminOnly, authMiddleware, getUser, isAdmin, type TokenVerifier } from './auth.js';
import {
  buildSignedPayload,
  sha256Hex,
  signPayload,
  verifyPayload,
  type SigningKeyPair,
} from './crypto.js';
import {
  appendSigningLog,
  deleteSignature,
  findByDocHash,
  getArchive,
  getSignature,
  insertArchive,
  isArchived,
  isSignerOf,
  listArchiveMeta,
  putSignature,
  type DB,
  type SigningLogRow,
} from './db.js';
import { verifyChainFromDb } from './verifyChain.js';
import type { UploadScanner } from './antivirus.js';

export interface AppDeps {
  db: DB;
  verifier: TokenVerifier;
  signingKey: SigningKeyPair;
  corsOrigin: string;
  /** Optional on-disk archive dir. If set, PDFs are also written as files. */
  archiveDir?: string;
  /** Group whose members may list/download the archive. */
  adminGroup: string;
  /**
   * Optional virus scanner. When set, every uploaded body is scanned before it
   * is used; an infected upload is rejected (422 `malware_detected`) and a
   * scanner error fails CLOSED (503 `scanner_unavailable`). When unset, scanning
   * is skipped entirely (graceful degradation for local/dev).
   */
  scanUpload?: UploadScanner;
}

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_PNG_BYTES = 2 * 1024 * 1024; // 2 MB

/** Read the raw request body as a Buffer, enforcing a size cap. */
async function readBody(c: { req: { arrayBuffer: () => Promise<ArrayBuffer> } }, max: number): Promise<Buffer> {
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (buf.length === 0) {
    throw new HttpError(400, 'empty_body');
  }
  if (buf.length > max) {
    throw new HttpError(413, 'payload_too_large');
  }
  return buf;
}

/**
 * Scan an uploaded buffer for malware before it is used. No-op when no scanner
 * is configured. Infected uploads raise 422; an unreachable/erroring scanner
 * fails closed with 503 rather than letting unscanned bytes through.
 */
async function ensureClean(scan: UploadScanner | undefined, buf: Buffer): Promise<void> {
  if (!scan) return;
  let verdict;
  try {
    verdict = await scan(buf);
  } catch {
    throw new HttpError(503, 'scanner_unavailable');
  }
  if (!verdict.clean) {
    throw new HttpError(422, 'malware_detected');
  }
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: deps.corsOrigin,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'X-Filename'],
      maxAge: 600,
    }),
  );

  // --- unauthenticated liveness ---
  app.get('/health', (c) => c.json({ status: 'ok', publicKey: deps.signingKey.publicKeyPem }));

  // --- everything below requires a valid PocketID bearer token ---
  const auth = authMiddleware(deps.verifier);
  const admin = adminOnly(deps.adminGroup);

  /**
   * POST /sign — accepts PDF bytes, hashes them, signs (sub-bound) and appends
   * a hash-chained registry/audit row. Returns a signing receipt.
   */
  app.post('/sign', auth, async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
      await ensureClean(deps.scanUpload, pdf);
    } catch (e) {
      return errorResponse(c, e);
    }
    const user = getUser(c);
    const docHash = sha256Hex(pdf);
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // The signed payload binds sub + signerName + docHash + createdAt
    // cryptographically.
    const payload = buildSignedPayload({
      sub: user.sub,
      signerName: user.name,
      docHash,
      createdAt,
    });
    const signature = signPayload(deps.signingKey.privateKey, payload);

    const row = appendSigningLog(deps.db, {
      id,
      sub: user.sub,
      signerName: user.name,
      createdAt,
      docHash,
      signature,
    });

    return c.json(
      {
        id: row.id,
        signer: { sub: row.sub, name: row.signer_name },
        createdAt: row.created_at,
        docHash: row.doc_hash,
        signature: row.signature,
      },
      201,
    );
  });

  /**
   * Cryptographically validate a registered row: the Ed25519 signature over the
   * canonical payload AND the integrity of the whole hash chain. A row found by
   * doc_hash is NOT trusted on existence alone — an attacker with DB write
   * access could insert a row with an arbitrary sub/signer_name and a bogus
   * signature. Only the signature (which they cannot produce without the
   * private key) proves authenticity.
   */
  function isRowCryptographicallyValid(row: SigningLogRow): boolean {
    const payload = buildSignedPayload({
      sub: row.sub,
      signerName: row.signer_name,
      docHash: row.doc_hash,
      createdAt: row.created_at,
    });
    if (!verifyPayload(deps.signingKey.publicKey, payload, row.signature)) {
      return false;
    }
    // Tamper-evidence across the whole append-only log.
    return verifyChainFromDb(deps.db, deps.signingKey.publicKey).valid;
  }

  /**
   * POST /verify — accepts PDF bytes, re-hashes, looks up the registry, and
   * cryptographically verifies the Ed25519 signature + hash chain.
   *
   * PUBLIC: verification requires no authentication — anyone holding a PDF may
   * check whether it is registered and unaltered. Uploads are still virus-scanned.
   */
  app.post('/verify', async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
      await ensureClean(deps.scanUpload, pdf);
    } catch (e) {
      return errorResponse(c, e);
    }
    const docHash = sha256Hex(pdf);
    const row = findByDocHash(deps.db, docHash);
    if (!row || !isRowCryptographicallyValid(row)) {
      return c.json({ valid: false });
    }
    return c.json({
      valid: true,
      signer: { sub: row.sub, name: row.signer_name },
      createdAt: row.created_at,
      docHash: row.doc_hash,
    });
  });

  /**
   * POST /archive — verifies first; only registered AND cryptographically
   * valid PDFs are stored.
   */
  app.post('/archive', auth, async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
      await ensureClean(deps.scanUpload, pdf);
    } catch (e) {
      return errorResponse(c, e);
    }
    const docHash = sha256Hex(pdf);
    const row = findByDocHash(deps.db, docHash);
    if (!row || !isRowCryptographicallyValid(row)) {
      return c.json({ archived: false, reason: 'not_registered' }, 422);
    }
    if (isArchived(deps.db, docHash)) {
      return c.json({ archived: true, alreadyArchived: true, docHash });
    }
    const id = randomUUID();
    const archivedAt = new Date().toISOString();
    // Optional original filename from header or query param (sanitized).
    const rawFilename = c.req.header('X-Filename') ?? c.req.query('filename') ?? null;
    const filename = rawFilename ? sanitizeFilename(rawFilename) : null;
    // Signer + signing time come straight from the registered signing-log row
    // already looked up by doc_hash above (findByDocHash).
    insertArchive(deps.db, {
      id,
      docHash,
      pdf,
      archivedAt,
      signerName: row.signer_name,
      signedAt: row.created_at,
      filename,
    });

    if (deps.archiveDir) {
      mkdirSync(deps.archiveDir, { recursive: true });
      writeFileSync(join(deps.archiveDir, `${docHash}.pdf`), pdf);
    }

    return c.json({ archived: true, id, docHash, archivedAt }, 201);
  });

  /**
   * GET /archive — admin-only listing of archived documents, newest first.
   * Returns metadata only (no PDF bytes).
   */
  app.get('/archive', auth, admin, (c) => {
    const rows = listArchiveMeta(deps.db);
    return c.json(
      rows.map((r) => ({
        docHash: r.doc_hash,
        signer: r.signer_name,
        signedAt: r.signed_at,
        archivedAt: r.archived_at,
        filename: r.filename,
      })),
    );
  });

  /**
   * GET /archive/:docHash — download an archived PDF. An admin may download any
   * document; a non-admin may download a document THEY signed (so a mission can
   * fetch its already-signed report from the archive instead of re-signing).
   * Authorization is checked before existence so a non-signer cannot probe which
   * hashes are archived. 404 when the doc hash is not archived.
   */
  app.get('/archive/:docHash', auth, (c) => {
    const docHash = c.req.param('docHash');
    const user = getUser(c);
    if (!isAdmin(user, deps.adminGroup) && !isSignerOf(deps.db, docHash, user.sub)) {
      return c.json({ error: 'forbidden' }, 403);
    }
    const row = getArchive(deps.db, docHash);
    if (!row) {
      return c.json({ error: 'not_found' }, 404);
    }
    const filename = sanitizeFilename(row.filename ?? `${docHash}.pdf`);
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', contentDisposition(filename));
    return c.body(toArrayBuffer(row.pdf));
  });

  /**
   * GET /me — the authenticated user's identity + admin status, so the SPA can
   * display the real name and gate admin-only UI.
   */
  app.get('/me', auth, (c) => {
    const user = getUser(c);
    return c.json({
      sub: user.sub,
      name: user.name,
      groups: user.groups,
      isAdmin: isAdmin(user, deps.adminGroup),
    });
  });

  // --- per-user stored signature (one PNG per sub) ---

  app.get('/me/signature', auth, (c) => {
    const user = getUser(c);
    const row = getSignature(deps.db, user.sub);
    if (!row) {
      return c.json({ error: 'not_found' }, 404);
    }
    c.header('Content-Type', 'image/png');
    c.header('Last-Modified', new Date(row.updated_at).toUTCString());
    return c.body(toArrayBuffer(row.image_png));
  });

  app.put('/me/signature', auth, async (c) => {
    const user = getUser(c);
    let png: Buffer;
    try {
      png = await readBody(c, MAX_PNG_BYTES);
      await ensureClean(deps.scanUpload, png);
    } catch (e) {
      return errorResponse(c, e);
    }
    if (!isPng(png)) {
      return c.json({ error: 'not_a_png' }, 415);
    }
    const updatedAt = new Date().toISOString();
    putSignature(deps.db, user.sub, png, updatedAt);
    return c.json({ updatedAt });
  });

  app.delete('/me/signature', auth, (c) => {
    const user = getUser(c);
    const removed = deleteSignature(deps.db, user.sub);
    if (!removed) {
      return c.json({ error: 'not_found' }, 404);
    }
    return c.json({ deleted: true });
  });

  return app;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC);
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/**
 * Strip characters that could break a Content-Disposition header (CR/LF,
 * quotes, backslashes, path separators) and trim length. Falls back to a safe
 * default when the result is empty.
 */
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\r\n"\\/]/g, '_')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, '')
    .trim()
    .slice(0, 255);
  return cleaned === '' ? 'document.pdf' : cleaned;
}

/**
 * Build an RFC 6266 Content-Disposition value. Provides an ASCII-only
 * `filename=` (non-ASCII bytes replaced) for legacy clients PLUS a UTF-8
 * `filename*=` so German filenames (umlauts) download correctly.
 */
function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorResponse(c: any, e: unknown) {
  if (e instanceof HttpError) {
    return c.json({ error: e.code }, e.status);
  }
  return c.json({ error: 'internal_error' }, 500);
}
