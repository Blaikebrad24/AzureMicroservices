#!/usr/bin/env bash
# Seed Azurite with initial test blob containers and sample blobs
set -e

AZURITE_CONNECTION="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1"

echo "Seeding Azurite blob storage..."

if ! command -v az &> /dev/null; then
  echo "azure-cli not installed. Skipping Azurite seeding."
  echo "Install with: brew install azure-cli"
  exit 0
fi

CONTAINERS=("reports" "uploads" "exports" "archives")

# Create containers
for container in "${CONTAINERS[@]}"; do
  az storage container create --name "$container" --connection-string "$AZURITE_CONNECTION" 2>/dev/null || true
done
echo "Created containers: ${CONTAINERS[*]}"

# Helper to upload a blob with content
upload_blob() {
  local container="$1"
  local name="$2"
  local content_type="$3"
  local content="$4"

  local tmpfile
  tmpfile=$(mktemp)
  echo "$content" > "$tmpfile"

  az storage blob upload \
    --container-name "$container" \
    --name "$name" \
    --file "$tmpfile" \
    --content-type "$content_type" \
    --connection-string "$AZURITE_CONNECTION" \
    --overwrite 2>/dev/null || true

  rm -f "$tmpfile"
}

# Seed 25 numbered text blobs per container
for container in "${CONTAINERS[@]}"; do
  echo "Seeding $container with blobs..."
  for i in $(seq -w 1 25); do
    upload_blob "$container" "${container}-file-${i}.txt" "text/plain" \
      "Sample content for ${container} file ${i}. Generated for local development testing."
  done
done

# Bonus blobs with varied content types for datatable variety
upload_blob "reports" "quarterly-summary.pdf" "application/pdf" \
  "PDF placeholder content for quarterly summary report"
upload_blob "reports" "annual-metrics.csv" "text/csv" \
  "date,metric,value\n2025-01-01,revenue,100000\n2025-02-01,revenue,120000"

upload_blob "uploads" "profile-photo.jpg" "image/jpeg" \
  "JPEG placeholder content"
upload_blob "uploads" "document-scan.pdf" "application/pdf" \
  "PDF placeholder content for scanned document"

upload_blob "exports" "data-export.csv" "text/csv" \
  "id,name,category\n1,Widget A,hardware\n2,Widget B,software"
upload_blob "exports" "chart-snapshot.png" "image/png" \
  "PNG placeholder content"

upload_blob "archives" "backup-2024.tar.gz" "application/gzip" \
  "Archive placeholder content"
upload_blob "archives" "legacy-report.pdf" "application/pdf" \
  "PDF placeholder content for legacy report"

TOTAL_BLOBS=$((25 * 4 + 8))
echo "Azurite seeding complete: ${TOTAL_BLOBS} blobs across ${#CONTAINERS[@]} containers"
