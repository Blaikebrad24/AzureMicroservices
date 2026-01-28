#!/usr/bin/env bash
# One-command local development setup
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== CompleteAzureApp Local Setup ==="

# 1. Copy .env if not present
if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
else
  echo ".env already exists, skipping."
fi

# 2. Generate self-signed TLS certificates
echo "Checking TLS certificates..."
bash scripts/generate-certs.sh

# 3. Build and start all containers
echo "Building and starting all containers..."
docker compose up --build -d

# 4. Wait for key services to be healthy
echo "Waiting for Postgres..."
bash scripts/wait-for-it.sh localhost:5432 -t 60

echo "Waiting for Redis..."
bash scripts/wait-for-it.sh localhost:6379 -t 30

echo "Waiting for Keycloak..."
bash scripts/wait-for-it.sh localhost:8080 -t 120

# 5. Seed Azurite with test data
echo "Seeding Azurite..."
bash scripts/seed-azurite.sh || echo "Azurite seeding skipped (optional)"

echo ""
echo "=== Setup Complete ==="
echo "Application: https://localhost"
echo "Keycloak Admin: http://localhost:8080 (admin/admin)"
echo ""
echo "Test Users:"
echo "  admin-user / password  (admin role)"
echo "  editor-user / password (editor role)"
echo "  viewer-user / password (viewer role)"
