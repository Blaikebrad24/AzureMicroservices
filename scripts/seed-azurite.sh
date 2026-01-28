#!/usr/bin/env bash
# Seed Azurite with initial test blob containers
set -e

AZURITE_CONNECTION="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1"

echo "Seeding Azurite blob storage..."

# Create test containers using az CLI (requires azure-cli installed)
if command -v az &> /dev/null; then
  az storage container create --name "reports" --connection-string "$AZURITE_CONNECTION" 2>/dev/null || true
  az storage container create --name "uploads" --connection-string "$AZURITE_CONNECTION" 2>/dev/null || true
  az storage container create --name "exports" --connection-string "$AZURITE_CONNECTION" 2>/dev/null || true
  echo "Azurite containers created: reports, uploads, exports"
else
  echo "azure-cli not installed. Skipping Azurite seeding."
  echo "Install with: brew install azure-cli"
fi
