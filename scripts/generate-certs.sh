#!/usr/bin/env bash
# Generate self-signed TLS certificates for local development
set -e

CERT_DIR="$(cd "$(dirname "$0")/../services/nginx-proxy/certs" && pwd)"

mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/server.crt" && -f "$CERT_DIR/server.key" ]]; then
  echo "Certificates already exist in $CERT_DIR. Skipping generation."
  echo "To regenerate, delete the existing files and run this script again."
  exit 0
fi

echo "Generating self-signed TLS certificate..."

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.crt" \
  -subj "/C=US/ST=Local/L=Local/O=Dev/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates generated:"
echo "  $CERT_DIR/server.crt"
echo "  $CERT_DIR/server.key"
