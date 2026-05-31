# UAV Signatures Backend (Phase 3)

Standalone Node/TypeScript service that provides the **cryptographic seal**
("Hash-Registry / Detached-Signatur") for the UAV checklists PWA. It is fully
disjoint from the frontend — its own `package.json`, deps, and test runner.

See the design spec:
`../docs/superpowers/specs/2026-05-31-digitale-signaturen-backend-design.md`
(Phase 3 section).

## What it does

- **Signs** the SHA-256 of a finished mission PDF with the server's Ed25519 key.
  The authenticated user's `sub` is **inside the signed payload**, so "who
  signed" is cryptographically bound — not forgeable via unsigned metadata.
- Records every signature in an **append-only, hash-chained audit log**
  (`signing_log`). Any later edit/delete/reorder breaks the chain and is
  detectable via `verifyChain()`.
- **Verifies** an uploaded PDF by re-hashing and looking it up in the registry.
- **Archives** only PDFs that verify (registered) — invalid ones are rejected.
- Stores **one PNG signature image per user** (`/me/signature`) for reuse.

> It deliberately does **not** produce eIDAS/PAdES signatures and does not
> modify PDF bytes. Verification happens through this service, not Adobe.

## Stack

- [Hono](https://hono.dev) — HTTP
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — file-backed SQLite
- [jose](https://github.com/panva/jose) — PocketID JWT / JWKS validation
- Node `crypto` — Ed25519 signing, SHA-256 hashing
- TypeScript (strict) + [Vitest](https://vitest.dev)

## Quick start

```bash
cd server
pnpm install
cp .env.example .env      # then edit OIDC_ISSUER / OIDC_AUDIENCE / CORS_ORIGIN
pnpm dev                  # tsx watch on :8787
```

Other scripts:

```bash
pnpm build        # tsc -> dist/
pnpm start        # node dist/index.js
pnpm test         # vitest run
pnpm verify-chain # walk the signing_log and assert the hash chain is intact
```

`pnpm verify-chain [path/to/signatures.db]` exits `0` when the chain is intact
and `1` (with the first broken row) when it is tampered.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `8787` | HTTP listen port |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Allowed SPA origin (exact match) |
| `OIDC_ISSUER` | **yes** | — | PocketID issuer URL; validates token `iss` |
| `OIDC_JWKS_URL` | no | `${OIDC_ISSUER}/.well-known/jwks.json` | JWKS endpoint |
| `OIDC_AUDIENCE` | **yes** | — | Expected access-token `aud` |
| `DB_PATH` | no | `./data/signatures.db` | SQLite file |
| `SIGNING_KEY_PATH` | no | `./data/signing-key.pem` | Ed25519 PKCS#8 PEM (auto-generated if missing) |
| `ARCHIVE_DIR` | no | `./data/archive` | On-disk archive directory |

The **signing key** is generated and persisted on first boot if absent (a
warning is logged). Treat it as a secret and back it up — losing it makes every
existing signature unverifiable.

## Endpoints

All endpoints except `/health` require a valid PocketID **Bearer** access token
(`Authorization: Bearer <token>`). The token is validated against the issuer's
JWKS (signature, `iss`, `aud`, `exp`); `sub` and display `name` are extracted.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| `GET` | `/health` | no | — | `{ status: "ok", publicKey }` (Ed25519 SPKI PEM) |
| `POST` | `/sign` | yes | PDF bytes | `201` receipt `{ id, signer:{sub,name}, createdAt, docHash, signature }` |
| `POST` | `/verify` | yes | PDF bytes | `{ valid:true, signer, createdAt, docHash }` or `{ valid:false }` |
| `POST` | `/archive` | yes | PDF bytes | `201 { archived:true, id, docHash, archivedAt }`; `422` if not registered |
| `GET` | `/me/signature` | yes | — | `image/png` bytes, or `404` |
| `PUT` | `/me/signature` | yes | PNG bytes | `{ updatedAt }`; `415` if not a PNG |
| `DELETE` | `/me/signature` | yes | — | `{ deleted:true }`, or `404` |

PDF / PNG bytes are sent as the raw request body (`Content-Type: application/pdf`
resp. `image/png`).

### Data model (SQLite)

- `signing_log` — registry **and** hash-chained audit log:
  `id, sub, signer_name, created_at, doc_hash, signature, prev_entry_hash, entry_hash`
  with `entry_hash = SHA256(prev_entry_hash ‖ id ‖ sub ‖ created_at ‖ doc_hash ‖ signature)`.
  Append-only; genesis `prev_entry_hash` is 64 zeros.
- `signatures` — `sub` (PK), `image_png` (BLOB), `updated_at`. One PNG per user.
- `archive` — `id, doc_hash, pdf` (BLOB), `archived_at`. Only registered docs.

The Ed25519 keypair is **not** in the DB — it is a mounted secret/file.

## PocketID registration

The SPA logs in via OIDC **Authorization Code + PKCE** (public client). This
backend only consumes the resulting **access token**. Register accordingly:

1. **SPA client** (public, PKCE, no secret): set the redirect URI(s) to the
   SPA origin, and ensure the issued **access token** carries:
   - `iss` = your PocketID issuer → matches `OIDC_ISSUER`
   - `aud` = the API audience → matches `OIDC_AUDIENCE`
   - a standard `sub`, and ideally `name` / `preferred_username` for display.
2. Make sure PocketID exposes a reachable **JWKS** at
   `${OIDC_ISSUER}/.well-known/jwks.json` (or set `OIDC_JWKS_URL` explicitly).
3. The SPA must send the access token as `Authorization: Bearer <token>` to this
   service, and the SPA origin must equal `CORS_ORIGIN`.

> If `aud`/`iss` do not line up, the service returns `401 invalid_token`. This
> is the most common misconfiguration — verify the access-token claims first.

## Docker

```bash
docker compose up --build
```

`docker-compose.yml` mounts a single named volume `uav-sign-data` at `/app/data`
for the SQLite DB, signing key, and archive. Set `OIDC_ISSUER`, `OIDC_AUDIENCE`
and `CORS_ORIGIN` in the compose `environment` block (or via an env file).

## Tests

```bash
cd server && pnpm install && pnpm test
```

Covers: hash-chain integrity & tamper detection, sign→verify round-trip,
verify rejecting a modified PDF, archive gating, `/me/signature` CRUD, the
Ed25519 sub-bound payload round-trip, and PocketID token validation against a
**mock JWKS** (valid/expired/wrong-aud/wrong-iss/untrusted-key/missing-header).
