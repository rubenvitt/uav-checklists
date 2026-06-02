import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { computeAuditEntryHash, computeEntryHash, GENESIS_PREV_HASH } from './crypto.js';

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
  /** ISO timestamp when soft-deleted, or null while active. */
  deleted_at: string | null;
}

/** Admin action recorded in the hash-chained, Ed25519-signed audit log. */
export type AuditAction = 'archive_delete' | 'archive_restore' | 'archive_purge';

/** One audit-log row (the signed, chained record of an admin action). */
export interface AuditLogRow {
  id: string;
  action: AuditAction;
  doc_hash: string;
  admin_sub: string;
  admin_name: string;
  reason: string | null;
  created_at: string;
  signature: string;
  prev_entry_hash: string;
  entry_hash: string;
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

    -- Hash-chained, Ed25519-signed audit log of admin actions on the archive
    -- (soft-delete / restore / purge). Append-only and independent of
    -- signing_log so the document-signature chain is never touched by deletions.
    CREATE TABLE IF NOT EXISTS audit_log (
      id              TEXT PRIMARY KEY,
      action          TEXT NOT NULL,
      doc_hash        TEXT NOT NULL,
      admin_sub       TEXT NOT NULL,
      admin_name      TEXT NOT NULL,
      reason          TEXT,
      created_at      TEXT NOT NULL,
      signature       TEXT NOT NULL,
      prev_entry_hash TEXT NOT NULL,
      entry_hash      TEXT NOT NULL,
      rowseq          INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_rowseq   ON audit_log (rowseq);
    CREATE INDEX IF NOT EXISTS idx_audit_log_doc_hash ON audit_log (doc_hash);
  `);

  // Guarded ALTERs: add metadata columns to the archive table if an older
  // database predates them. SQLite has no "ADD COLUMN IF NOT EXISTS", so we
  // inspect the table schema first.
  addColumnIfMissing(db, 'archive', 'signer_name', 'TEXT');
  addColumnIfMissing(db, 'archive', 'signed_at', 'TEXT');
  addColumnIfMissing(db, 'archive', 'filename', 'TEXT');
  // Soft-delete marker: null while active, ISO timestamp once moved to the bin.
  addColumnIfMissing(db, 'archive', 'deleted_at', 'TEXT');
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

/**
 * Whether the given user (sub) appears as a signer of this document hash.
 * Used to authorize a signer (not just an admin) to download their own
 * archived PDF.
 */
export function isSignerOf(db: DB, docHash: string, sub: string): boolean {
  const row = db
    .prepare('SELECT 1 AS one FROM signing_log WHERE doc_hash = ? AND sub = ? LIMIT 1')
    .get(docHash, sub) as { one: number } | undefined;
  return row !== undefined;
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

/** Active (not soft-deleted) archive metadata, newest first (no PDF bytes). */
export function listArchiveMeta(db: DB): ArchiveMetaRow[] {
  return db
    .prepare(
      `SELECT doc_hash, archived_at, signer_name, signed_at, filename, deleted_at
       FROM archive WHERE deleted_at IS NULL ORDER BY archived_at DESC`,
    )
    .all() as ArchiveMetaRow[];
}

/** Soft-deleted archive metadata ("recycle bin"), most recently deleted first. */
export function listDeletedArchiveMeta(db: DB): ArchiveMetaRow[] {
  return db
    .prepare(
      `SELECT doc_hash, archived_at, signer_name, signed_at, filename, deleted_at
       FROM archive WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    )
    .all() as ArchiveMetaRow[];
}

/**
 * Soft-delete an active archive entry (move it to the recycle bin). Returns
 * false when no ACTIVE entry with that hash exists (unknown or already deleted),
 * so the caller can answer 404 without a separate existence check.
 */
export function softDeleteArchive(db: DB, docHash: string, deletedAt: string): boolean {
  const info = db
    .prepare('UPDATE archive SET deleted_at = ? WHERE doc_hash = ? AND deleted_at IS NULL')
    .run(deletedAt, docHash);
  return info.changes > 0;
}

/**
 * Restore a soft-deleted entry. Returns false when no soft-deleted entry with
 * that hash exists (unknown or not currently deleted).
 */
export function restoreArchive(db: DB, docHash: string): boolean {
  const info = db
    .prepare('UPDATE archive SET deleted_at = NULL WHERE doc_hash = ? AND deleted_at IS NOT NULL')
    .run(docHash);
  return info.changes > 0;
}

/**
 * Permanently remove a SOFT-DELETED archive entry from the DB. Returns false
 * when no soft-deleted entry with that hash exists; the caller still removes the
 * on-disk PDF file separately. Purge only ever operates on the recycle bin so an
 * active entry can never be erased in a single step.
 */
export function purgeArchive(db: DB, docHash: string): boolean {
  const info = db
    .prepare('DELETE FROM archive WHERE doc_hash = ? AND deleted_at IS NOT NULL')
    .run(docHash);
  return info.changes > 0;
}

/** Whether a soft-deleted entry exists for this hash (drives 404 vs 409). */
export function isSoftDeleted(db: DB, docHash: string): boolean {
  const row = db
    .prepare('SELECT 1 AS one FROM archive WHERE doc_hash = ? AND deleted_at IS NOT NULL LIMIT 1')
    .get(docHash) as { one: number } | undefined;
  return row !== undefined;
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

// --- audit log (hash-chained, Ed25519-signed admin actions) ---

/** The `prev_entry_hash` for the next audit row (genesis if the log is empty). */
export function lastAuditEntryHash(db: DB): string {
  const row = db
    .prepare('SELECT entry_hash FROM audit_log ORDER BY rowseq DESC LIMIT 1')
    .get() as { entry_hash: string } | undefined;
  return row?.entry_hash ?? GENESIS_PREV_HASH;
}

function nextAuditRowSeq(db: DB): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(rowseq), 0) AS m FROM audit_log')
    .get() as { m: number };
  return row.m + 1;
}

/**
 * Append a hash-chained, signed audit row. The `signature` (Ed25519 over the
 * canonical audit payload) is computed by the caller. Runs in a transaction so
 * the prev-hash read and the insert are atomic.
 */
export function appendAuditLog(
  db: DB,
  fields: {
    id: string;
    action: AuditAction;
    docHash: string;
    adminSub: string;
    adminName: string;
    reason: string | null;
    createdAt: string;
    signature: string;
  },
): AuditLogRow {
  const insert = db.transaction((): AuditLogRow => {
    const prevEntryHash = lastAuditEntryHash(db);
    const entryHash = computeAuditEntryHash({
      prevEntryHash,
      id: fields.id,
      action: fields.action,
      docHash: fields.docHash,
      adminSub: fields.adminSub,
      createdAt: fields.createdAt,
      signature: fields.signature,
    });
    const seq = nextAuditRowSeq(db);
    db.prepare(
      `INSERT INTO audit_log
        (id, action, doc_hash, admin_sub, admin_name, reason, created_at, signature, prev_entry_hash, entry_hash, rowseq)
       VALUES (@id, @action, @doc_hash, @admin_sub, @admin_name, @reason, @created_at, @signature, @prev_entry_hash, @entry_hash, @rowseq)`,
    ).run({
      id: fields.id,
      action: fields.action,
      doc_hash: fields.docHash,
      admin_sub: fields.adminSub,
      admin_name: fields.adminName,
      reason: fields.reason,
      created_at: fields.createdAt,
      signature: fields.signature,
      prev_entry_hash: prevEntryHash,
      entry_hash: entryHash,
      rowseq: seq,
    });
    return {
      id: fields.id,
      action: fields.action,
      doc_hash: fields.docHash,
      admin_sub: fields.adminSub,
      admin_name: fields.adminName,
      reason: fields.reason,
      created_at: fields.createdAt,
      signature: fields.signature,
      prev_entry_hash: prevEntryHash,
      entry_hash: entryHash,
    };
  });
  return insert();
}

/**
 * The reason from the most recent `archive_delete` audit entry for a document,
 * or null when none was given. Used to display why a soft-deleted entry is in
 * the recycle bin (the audit log is the source of truth for the reason).
 */
export function latestDeleteReason(db: DB, docHash: string): string | null {
  const row = db
    .prepare(
      `SELECT reason FROM audit_log
       WHERE doc_hash = ? AND action = 'archive_delete'
       ORDER BY rowseq DESC LIMIT 1`,
    )
    .get(docHash) as { reason: string | null } | undefined;
  return row?.reason ?? null;
}

/** All audit-log rows in append order (for chain verification / display). */
export function allAuditLog(db: DB): AuditLogRow[] {
  return db
    .prepare(
      `SELECT id, action, doc_hash, admin_sub, admin_name, reason, created_at, signature, prev_entry_hash, entry_hash
       FROM audit_log ORDER BY rowseq ASC`,
    )
    .all() as AuditLogRow[];
}
