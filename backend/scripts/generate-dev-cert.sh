#!/usr/bin/env bash
set -euo pipefail

CERT_PASSWORD="${1:-devpassword}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/certs"

mkdir -p "$CERTS_DIR"

echo "Generating self-signed development signing certificate..."

# Generate private key and self-signed certificate
openssl req -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days 365 \
  -nodes \
  -keyout "$CERTS_DIR/signing.key" \
  -out "$CERTS_DIR/signing.pem" \
  -subj "/CN=UAV Dev Signing/O=Development/C=DE" \
  2>/dev/null

# Package into PKCS#12
openssl pkcs12 -export \
  -in "$CERTS_DIR/signing.pem" \
  -inkey "$CERTS_DIR/signing.key" \
  -out "$CERTS_DIR/signing.p12" \
  -passout "pass:$CERT_PASSWORD" \
  2>/dev/null

# Clean up intermediate files
rm -f "$CERTS_DIR/signing.key" "$CERTS_DIR/signing.pem"

echo ""
echo "Development certificate generated:"
echo "  File:     $CERTS_DIR/signing.p12"
echo "  Password: $CERT_PASSWORD"
echo ""
echo "Set SIGNER_CERT_PASSWORD=$CERT_PASSWORD in backend/.env"
