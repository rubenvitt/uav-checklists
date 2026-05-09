# UAV Signing Backend - Produktionseinrichtung

## Architektur

```
Frontend (SPA)  -->  API Gateway (Hono, :3001)  -->  Signer (FastAPI, :8000 intern)
                          |
                     OIDC / PocketID
```

- **API Gateway** (`backend/api/`): Node.js, validiert OIDC-Tokens, leitet Signing-Requests an den Signer weiter
- **Signer** (`backend/signer/`): Python, signiert PDFs mit pyHanko (PAdES B-LTA), nie direkt erreichbar

## Voraussetzungen

- Docker + Docker Compose
- Ein Signaturzertifikat (.p12 / PKCS#12)
- PocketID-Instanz (oder anderer OIDC-Provider)
- Domain mit HTTPS (z.B. via Reverse Proxy)

## 1. Signaturzertifikat beschaffen

### Option A: Selbstsigniert (intern)

Reicht fuer interne Nutzung. Adobe zeigt eine gelbe Warnung ("Identitaet unbekannt"), die kryptografische Integritaet ist aber gegeben.

```bash
bash backend/scripts/generate-dev-cert.sh mein-sicheres-passwort
```

### Option B: Offizielles Zertifikat (extern)

Fuer den gruenen Haken in Adobe Reader wird ein Zertifikat von der [Adobe Approved Trust List (AATL)](https://helpx.adobe.com/acrobat/kb/approved-trust-list1.html) benoetigt:

- **Certum**: ~65-100 EUR/Jahr (guenstigste Option)
- **GlobalSign**: ab ~200 EUR/Jahr
- **DigiCert**: ab ~400 EUR/Jahr

Das Zertifikat als `.p12`-Datei exportieren und unter `backend/certs/signing.p12` ablegen.

**Wichtig**: Let's Encrypt-Zertifikate funktionieren NICHT fuer PDF-Signaturen (fehlende Document Signing EKU).

## 2. Umgebungsvariablen konfigurieren

```bash
cp backend/.env.example backend/.env
```

Datei `backend/.env` bearbeiten:

```env
# --- API Gateway ---
API_PORT=3001
CORS_ORIGIN=https://app.example.com

# --- OIDC Authentication ---
OIDC_ISSUER=https://auth.example.com
OIDC_CLIENT_ID=uav-checklists

# --- Signer Service ---
SIGNER_CERT_PASSWORD=das-echte-passwort
SIGNER_TSA_URL=http://timestamp.digicert.com
```

| Variable | Beschreibung |
|---|---|
| `API_PORT` | Port des API Gateways (Default: 3001) |
| `CORS_ORIGIN` | Frontend-URL fuer CORS (exakte URL, kein Wildcard) |
| `OIDC_ISSUER` | PocketID / OIDC Issuer URL |
| `OIDC_CLIENT_ID` | OIDC Client ID (in PocketID angelegt) |
| `SIGNER_CERT_PASSWORD` | Passwort der .p12-Datei |
| `SIGNER_TSA_URL` | Timestamp Authority (Default: DigiCert, kostenlos) |

## 3. PocketID einrichten

1. In PocketID einen neuen OIDC-Client anlegen:
   - **Client ID**: `uav-checklists`
   - **Redirect URI**: `https://app.example.com`
   - **Grant Type**: Authorization Code
   - **Scopes**: `openid profile email`
2. Die Issuer-URL und Client-ID in die `.env` eintragen

## 4. Starten

```bash
cd backend
docker compose up -d --build
```

Pruefen:

```bash
curl https://api.example.com/health
# {"status":"ok","signer":true}
```

## 5. Reverse Proxy (Empfohlen)

In Produktion sollte ein Reverse Proxy (Traefik, Caddy, nginx) vor dem API Gateway stehen:

### Caddy (einfachste Option)

```
app.example.com {
    reverse_proxy /api/* localhost:3001
    root * /var/www/uav-checklists
    file_server
    try_files {path} /index.html
}
```

### nginx

```nginx
server {
    server_name app.example.com;
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
    
    location / {
        root /var/www/uav-checklists;
        try_files $uri /index.html;
    }
}
```

## 6. Frontend konfigurieren

Im Browser auf die App navigieren und:

1. Auf der Uebersichtsseite das Zahnrad-Icon klicken
2. **Backend-URL** eintragen: `https://app.example.com` (wenn gleiche Domain via Reverse Proxy) oder `https://api.example.com:3001`
3. **OIDC** konfigurieren: Issuer-URL und Client-ID eintragen (gleiches Zahnrad-Menue)
4. Anmelden

## Sicherheitshinweise

- Die `.p12`-Datei NIE ins Git-Repository committen (ist in `.gitignore`)
- `.env`-Datei mit `chmod 600` schuetzen
- Der Signer-Service ist per `expose` nur intern erreichbar, nie direkt aus dem Internet
- Zertifikat-Passwort ueber einen Secret Manager verwalten (z.B. Docker Secrets, Vault)
- CORS auf die exakte Frontend-URL beschraenken, kein `*`

## TSA-Alternativen

| TSA | URL | Kosten | AATL |
|---|---|---|---|
| DigiCert (Default) | `http://timestamp.digicert.com` | kostenlos | ja |
| FreeTSA | `https://freetsa.org/tsr` | kostenlos | nein |
| Sectigo | `http://timestamp.sectigo.com` | kostenlos | ja |

## Fehlerbehebung

**502 Bad Gateway beim Signieren**
- Signer-Logs pruefen: `docker compose logs signer`
- Zertifikat-Passwort korrekt?
- Zertifikat hat `nonRepudiation` Key Usage?

**OIDC-Login schlaegt fehl**
- Issuer-URL erreichbar? Redirect-URI korrekt?
- Client-ID stimmt mit PocketID ueberein?

**Signatur in Adobe nicht vertrauenswuerdig**
- Selbstsigniertes Zertifikat: Zertifikat manuell in Adobe als vertrauenswuerdig einstufen
- Oder ein AATL-Zertifikat verwenden (siehe Abschnitt 1)
