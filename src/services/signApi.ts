/**
 * Client for the optional signature backend (Phase 2/3).
 *
 * Graceful degradation is the default: when `VITE_SIGN_API_URL` is empty or
 * undefined, {@link isSignApiConfigured} returns `false` and every wrapper
 * returns `null` / a disabled result WITHOUT issuing a network request. No
 * e-signature or login UI may render in that case.
 *
 * This module is intentionally framework-free (no React import). The access
 * token is supplied by the caller (the auth context) via a registered provider,
 * so the wrappers stay usable from anywhere.
 */
import { downloadPdf } from '../utils/generateReport'

/** Configured backend base URL, or `undefined` when the feature is disabled. */
const RAW_BASE_URL = import.meta.env.VITE_SIGN_API_URL as string | undefined

/** Normalised base URL (no trailing slash) or `null` when unconfigured. */
const BASE_URL: string | null =
  RAW_BASE_URL && RAW_BASE_URL.trim() !== ''
    ? RAW_BASE_URL.trim().replace(/\/+$/, '')
    : null

/** Whether the signature backend is configured at all. */
export function isSignApiConfigured(): boolean {
  return BASE_URL !== null
}

/** Configured backend base URL (no trailing slash), or `null` when disabled. */
export function getSignApiBaseUrl(): string | null {
  return BASE_URL
}

/* ── Access-token provider ─────────────────────────────────── */

let accessTokenProvider: (() => string | null) | null = null

/**
 * Registers a function that returns the current OIDC access token (or `null`).
 * Called once by the auth provider so the wrappers can authenticate without a
 * React dependency.
 */
export function setAccessTokenProvider(provider: (() => string | null) | null): void {
  accessTokenProvider = provider
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = accessTokenProvider?.() ?? null
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

/* ── Data-URL <-> Blob helpers ─────────────────────────────── */

/** Converts a PNG data-URL to a Blob (`image/png`) for upload bodies. */
export async function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/** Converts raw PNG bytes (from the backend) to a PNG data-URL for the UI. */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/* ── Health / availability ─────────────────────────────────── */

export interface HealthResult {
  status: string
  publicKey?: string
}

/**
 * Pings `GET /health`. Returns `null` when the backend is unconfigured or
 * unreachable — callers treat `null` as "backend-dependent UI stays hidden".
 */
export async function pingHealth(signal?: AbortSignal): Promise<HealthResult | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal })
    if (!res.ok) return null
    return (await res.json()) as HealthResult
  } catch {
    return null
  }
}

/* ── Stored personal signature (/me/signature) ─────────────── */

/**
 * `GET /me/signature` → stored PNG as a data-URL, or `null` when not configured,
 * not found (404), or on error.
 */
export async function getStoredSignature(): Promise<string | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/me/signature`, {
      headers: authHeaders(),
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const raw = await res.blob()
    // Force an image/png MIME so the resulting data-URL is always
    // `data:image/png;...` — some responses arrive without a usable blob type,
    // which would otherwise yield `data:application/octet-stream` and be
    // rejected by the PDF signature embedder.
    const blob = raw.type === 'image/png' ? raw : raw.slice(0, raw.size, 'image/png')
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

/**
 * `PUT /me/signature` with the drawn signature (PNG data-URL). Returns `true`
 * on success, `false` otherwise. No-op (`false`) when unconfigured.
 */
export async function putStoredSignature(dataUrl: string): Promise<boolean> {
  if (!BASE_URL) return false
  try {
    const body = await dataUrlToPngBlob(dataUrl)
    const res = await fetch(`${BASE_URL}/me/signature`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'image/png' }),
      body,
    })
    return res.ok
  } catch {
    return false
  }
}

/** `DELETE /me/signature`. Returns `true` on success. */
export async function deleteStoredSignature(): Promise<boolean> {
  if (!BASE_URL) return false
  try {
    const res = await fetch(`${BASE_URL}/me/signature`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

/* ── Phase 3 cryptographic seal (wrappers only, no UI here) ── */

export interface SignReceipt {
  id: string
  signer: { sub: string; name?: string }
  createdAt: string
  docHash: string
  signature: string
}

export interface VerifyResult {
  valid: boolean
  signer?: { sub: string; name?: string }
  createdAt?: string
  docHash?: string
}

export interface ArchiveResult {
  archived: boolean
  id?: string
  docHash?: string
  archivedAt?: string
}

/** `POST /sign` — seal a finished PDF. (Phase 3; wrapper provided, no UI yet.) */
export async function signPdf(pdf: Blob): Promise<SignReceipt | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/sign`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/pdf' }),
      body: pdf,
    })
    if (!res.ok) return null
    return (await res.json()) as SignReceipt
  } catch {
    return null
  }
}

/** `POST /verify` — verify a PDF against the registry. (Phase 3.) */
export async function verifyPdf(pdf: Blob): Promise<VerifyResult | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/verify`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/pdf' }),
      body: pdf,
    })
    if (!res.ok) return null
    return (await res.json()) as VerifyResult
  } catch {
    return null
  }
}

/** `POST /archive` — archive a registered PDF. (Phase 3.) */
export async function archivePdf(pdf: Blob): Promise<ArchiveResult | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/archive`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/pdf' }),
      body: pdf,
    })
    if (!res.ok) return null
    return (await res.json()) as ArchiveResult
  } catch {
    return null
  }
}

/* ── Identity & admin (/me) ─────────────────────────────────── */

/** Authenticated user identity + admin status, as returned by `GET /me`. */
export interface MeResult {
  sub: string
  name: string
  groups: string[]
  isAdmin: boolean
}

/**
 * `GET /me` — the authenticated user's identity and admin status. Returns
 * `null` when unconfigured, unauthenticated (401), or on error, so callers can
 * fall back to client-side group inspection.
 */
export async function fetchMe(): Promise<MeResult | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    return (await res.json()) as MeResult
  } catch {
    return null
  }
}

/* ── Admin archive viewer (/archive list + download) ───────── */

/** One archived document's metadata, as returned by `GET /archive`. */
export interface ArchiveEntry {
  docHash: string
  signer: string | null
  signedAt: string | null
  archivedAt: string
  filename: string | null
}

/**
 * `GET /archive` — admin-only listing of archived documents, newest first.
 *
 * Returns `null` when unconfigured, not permitted (401/403), or on error;
 * returns an empty array `[]` on a successful-but-empty archive. Callers use
 * this distinction to separate the error state from the empty state.
 */
export async function listArchive(): Promise<ArchiveEntry[] | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/archive`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    return (await res.json()) as ArchiveEntry[]
  } catch {
    return null
  }
}

/**
 * `GET /archive/:docHash` — admin-only download of an archived PDF. Streams the
 * blob to a browser download via {@link downloadPdf}. No-op when unconfigured,
 * not permitted, not found, or on error.
 */
export async function downloadArchive(docHash: string, filename?: string): Promise<void> {
  if (!BASE_URL) return
  try {
    const res = await fetch(`${BASE_URL}/archive/${encodeURIComponent(docHash)}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return
    const blob = await res.blob()
    downloadPdf(blob, filename ?? `${docHash}.pdf`)
  } catch {
    // Download failed — surface nothing; the panel keeps its current state.
  }
}
