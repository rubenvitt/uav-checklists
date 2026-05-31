import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { computeEntryHash, GENESIS_PREV_HASH } from './crypto.js';

export type DB = Database.Database;

export interface SigningLogRow {
  id: string;
  sub: string;
  signer_name: string;
  created_at: string;
  doc_hash: string;
  signature: string;
  prev_entry_hash: string;
  entry_hash: string;
}

export interface SignatureRow {
  sub: string;
  image_png: Buffer;
  updated_at: string;
}

export interface ArchiveRow {
  id: string;
  doc_hash: string;
  pdf: Buffer;
  archived_at: string;
  signer_name: string | null;
  signed_at: string | null;
  filename: string | null;
}

/** Archive metadata row (no PDF bytes) for listing. */
export interface ArchiveMetaRow {
  doc_hash: string;
  archived_at: string;
  signer_name: string | null;
  signed_at: string | null;
  filename: string | null;
}

/**
 * Open (and migrate) the SQLite database. Pass ':memory:' for tests.
 */
export function openDb(path: string): DB {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signing_log (
      id              TEXT PRIMARY KEY,
      sub             TEXT NOT NULL,
      signer_name     TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      doc_hash        TEXT NOT NULL,
      signature       TEXT NOT NULL,
      prev_entry_hash TEXT NOT NULL,
      entry_hash      TEXT NOT NULL,
      rowseq          INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_signing_log_doc_hash ON signing_log (doc_hash);
    CREATE INDEX IF NOT EXISTS idx_signing_log_rowseq   ON signing_log (rowseq);

    CREATE TABLE IF NOT EXISTS signatures (
      sub        TEXT PRIMARY KEY,
      image_png  BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- doc_hash logically references signing_log.doc_hash, but that column is not
    -- a UNIQUE key (a document may be re-signed), so no DB-level FK is declared.
    -- The /archive endpoint enforces "must be registered" via findByDocHash().
    CREATE TABLE IF NOT EXISTS archive (
      id          TEXT PRIMARY KEY,
      doc_hash    TEXT NOT NULL,
      pdf         BLOB NOT NULL,
      archived_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archive_doc_hash ON archive (doc_hash);
  `);

  // Guarded ALTERs: add metadata columns to the archive table if an older
  // database predates them. SQLite has no "ADD COLUMN IF NOT EXISTS", so we
  // inspect the table schema first.
  addColumnIfMissing(db, 'archive', 'signer_name', 'TEXT');
  addColumnIfMissing(db, 'archive', 'signed_at', 'TEXT');
  addColumnIfMissing(db, 'archive', 'filename', 'TEXT');
}

/** Add a column to a table only when it does not already exist. */
function addColumnIfMissing(db: DB, table: string, column: string, type: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/** The `prev_entry_hash` for the next appended row (genesis if the log is empty). */
export function lastEntryHash(db: DB): string {
  const row = db
    .prepare('SELECT entry_hash FROM signing_log ORDER BY rowseq DESC LIMIT 1')
    .get() as { entry_hash: string } | undefined;
  return row?.entry_hash ?? GENESIS_PREV_HASH;
}

function nextRowSeq(db: DB): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(rowseq), 0) AS m FROM signing_log')
    .get() as { m: number };
  return row.m + 1;
}

/**
 * Append a new signing-log row that is ALSO the hash-chained audit entry.
 * Returns the inserted row. Runs in a transaction so the prev-hash read and
 * the insert are atomic (chain stays consistent under concurrency).
 */
export function appendSigningLog(
  db: DB,
  fields: {
    id: string;
    sub: string;
    signerName: string;
    createdAt: string;
    docHash: string;
    signature: string;
  },
): SigningLogRow {
  const insert = db.transaction((): SigningLogRow => {
    const prevEntryHash = lastEntryHash(db);
    const entryHash = computeEntryHash({
      prevEntryHash,
      id: fields.id,
      sub: fields.sub,
      createdAt: fields.createdAt,
      docHash: fields.docHash,
      signature: fields.signature,
    });
    const seq = nextRowSeq(db);
    db.prepare(
      `INSERT INTO signing_log
        (id, sub, signer_name, created_at, doc_hash, signature, prev_entry_hash, entry_hash, rowseq)
       VALUES (@id, @sub, @signer_name, @created_at, @doc_hash, @signature, @prev_entry_hash, @entry_hash, @rowseq)`,
    ).run({
      id: fields.id,
      sub: fields.sub,
      signer_name: fields.signerName,
      created_at: fields.createdAt,
      doc_hash: fields.docHash,
      signature: fields.signature,
      prev_entry_hash: prevEntryHash,
      entry_hash: entryHash,
      rowseq: seq,
    });
    return {
      id: fields.id,
      sub: fields.sub,
      signer_name: fields.signerName,
      created_at: fields.createdAt,
      doc_hash: fields.docHash,
      signature: fields.signature,
      prev_entry_hash: prevEntryHash,
      entry_hash: entryHash,
    };
  });
  return insert();
}

/** Most recent signing-log row for a given document hash, if registered. */
export function findByDocHash(db: DB, docHash: string): SigningLogRow | undefined {
  return db
    .prepare(
      `SELECT id, sub, signer_name, created_at, doc_hash, signature, prev_entry_hash, entry_hash
       FROM signing_log WHERE doc_hash = ? ORDER BY rowseq DESC LIMIT 1`,
    )
    .get(docHash) as SigningLogRow | undefined;
}

/** All signing-log rows in append order (for chain verification / audit). */
export function allSigningLog(db: DB): SigningLogRow[] {
  return db
    .prepare(
      `SELECT id, sub, signer_name, created_at, doc_hash, signature, prev_entry_hash, entry_hash
       FROM signing_log ORDER BY rowseq ASC`,
    )
    .all() as SigningLogRow[];
}

// --- signatures (one PNG per sub) ---

export function getSignature(db: DB, sub: string): SignatureRow | undefined {
  return db
    .prepare('SELECT sub, image_png, updated_at FROM signatures WHERE sub = ?')
    .get(sub) as SignatureRow | undefined;
}

export function putSignature(db: DB, sub: string, imagePng: Buffer, updatedAt: string): void {
  db.prepare(
    `INSERT INTO signatures (sub, image_png, updated_at)
     VALUES (@sub, @image_png, @updated_at)
     ON CONFLICT(sub) DO UPDATE SET image_png = excluded.image_png, updated_at = excluded.updated_at`,
  ).run({ sub, image_png: imagePng, updated_at: updatedAt });
}

export function deleteSignature(db: DB, sub: string): boolean {
  const info = db.prepare('DELETE FROM signatures WHERE sub = ?').run(sub);
  return info.changes > 0;
}

// --- archive ---

export function insertArchive(
  db: DB,
  fields: {
    id: string;
    docHash: string;
    pdf: Buffer;
    archivedAt: string;
    signerName?: string | null;
    signedAt?: string | null;
    filename?: string | null;
  },
): void {
  db.prepare(
    `INSERT INTO archive (id, doc_hash, pdf, archived_at, signer_name, signed_at, filename)
     VALUES (@id, @doc_hash, @pdf, @archived_at, @signer_name, @signed_at, @filename)`,
  ).run({
    id: fields.id,
    doc_hash: fields.docHash,
    pdf: fields.pdf,
    archived_at: fields.archivedAt,
    signer_name: fields.signerName ?? null,
    signed_at: fields.signedAt ?? null,
    filename: fields.filename ?? null,
  });
}

export function isArchived(db: DB, docHash: string): boolean {
  const row = db
    .prepare('SELECT 1 AS one FROM archive WHERE doc_hash = ? LIMIT 1')
    .get(docHash) as { one: number } | undefined;
  return row !== undefined;
}

/** Archive metadata for all entries, newest first (no PDF bytes). */
export function listArchiveMeta(db: DB): ArchiveMetaRow[] {
  return db
    .prepare(
      `SELECT doc_hash, archived_at, signer_name, signed_at, filename
       FROM archive ORDER BY archived_at DESC`,
    )
    .all() as ArchiveMetaRow[];
}

/** The archived PDF + metadata for a given doc hash, if present. */
export function getArchive(db: DB, docHash: string): ArchiveRow | undefined {
  return db
    .prepare(
      `SELECT id, doc_hash, pdf, archived_at, signer_name, signed_at, filename
       FROM archive WHERE doc_hash = ? LIMIT 1`,
    )
    .get(docHash) as ArchiveRow | undefined;
}
