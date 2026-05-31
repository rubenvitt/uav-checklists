import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { authMiddleware, getUser, type TokenVerifier } from './auth.js';
import {
  buildSignedPayload,
  sha256Hex,
  signPayload,
  type SigningKeyPair,
} from './crypto.js';
import {
  appendSigningLog,
  deleteSignature,
  findByDocHash,
  getSignature,
  insertArchive,
  isArchived,
  putSignature,
  type DB,
} from './db.js';

export interface AppDeps {
  db: DB;
  verifier: TokenVerifier;
  signingKey: SigningKeyPair;
  corsOrigin: string;
  /** Optional on-disk archive dir. If set, PDFs are also written as files. */
  archiveDir?: string;
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
      allowHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );

  // --- unauthenticated liveness ---
  app.get('/health', (c) => c.json({ status: 'ok', publicKey: deps.signingKey.publicKeyPem }));

  // --- everything below requires a valid PocketID bearer token ---
  const auth = authMiddleware(deps.verifier);

  /**
   * POST /sign — accepts PDF bytes, hashes them, signs (sub-bound) and appends
   * a hash-chained registry/audit row. Returns a signing receipt.
   */
  app.post('/sign', auth, async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
    } catch (e) {
      return errorResponse(c, e);
    }
    const user = getUser(c);
    const docHash = sha256Hex(pdf);
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // The signed payload binds sub + docHash + createdAt cryptographically.
    const payload = buildSignedPayload({ sub: user.sub, docHash, createdAt });
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
   * POST /verify — accepts PDF bytes, re-hashes, looks up the registry.
   */
  app.post('/verify', auth, async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
    } catch (e) {
      return errorResponse(c, e);
    }
    const docHash = sha256Hex(pdf);
    const row = findByDocHash(deps.db, docHash);
    if (!row) {
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
   * POST /archive — verifies first; only registered (valid) PDFs are stored.
   */
  app.post('/archive', auth, async (c) => {
    let pdf: Buffer;
    try {
      pdf = await readBody(c, MAX_PDF_BYTES);
    } catch (e) {
      return errorResponse(c, e);
    }
    const docHash = sha256Hex(pdf);
    const row = findByDocHash(deps.db, docHash);
    if (!row) {
      return c.json({ archived: false, reason: 'not_registered' }, 422);
    }
    if (isArchived(deps.db, docHash)) {
      return c.json({ archived: true, alreadyArchived: true, docHash });
    }
    const id = randomUUID();
    const archivedAt = new Date().toISOString();
    insertArchive(deps.db, { id, docHash, pdf, archivedAt });

    if (deps.archiveDir) {
      mkdirSync(deps.archiveDir, { recursive: true });
      writeFileSync(join(deps.archiveDir, `${docHash}.pdf`), pdf);
    }

    return c.json({ archived: true, id, docHash, archivedAt }, 201);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorResponse(c: any, e: unknown) {
  if (e instanceof HttpError) {
    return c.json({ error: e.code }, e.status);
  }
  return c.json({ error: 'internal_error' }, 500);
}
