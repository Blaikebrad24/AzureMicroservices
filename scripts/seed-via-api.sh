#!/bin/sh
# Seed Azurite through the blob-service REST API (no az CLI required)
# Works in both Docker (alpine/sh) and host (bash) environments
# Requires: curl, blob-service reachable at BLOB_API
set -e

BLOB_API="${BLOB_API:-http://localhost:8081/api/blobs}"

echo "Waiting for blob-service at ${BLOB_API}..."
i=0
while [ "$i" -lt 60 ]; do
  if curl -sf "${BLOB_API}/containers" > /dev/null 2>&1; then
    echo "blob-service is ready."
    break
  fi
  i=$((i + 1))
  if [ "$i" -eq 60 ]; then
    echo "ERROR: blob-service not reachable at ${BLOB_API} after 60s"
    exit 1
  fi
  sleep 2
done

upload_blob() {
  container="$1"
  filename="$2"
  content="$3"

  tmpfile=$(mktemp)
  echo "$content" > "$tmpfile"

  curl -sf -X POST "${BLOB_API}/${container}" \
    -F "file=@${tmpfile};filename=${filename}" \
    > /dev/null 2>&1 || echo "  WARN: failed to upload ${container}/${filename}"

  rm -f "$tmpfile"
}

# Seed numbered blobs per container
for container in reports uploads exports archives; do
  echo "Seeding ${container}..."
  n=1
  while [ "$n" -le 10 ]; do
    padded=$(printf "%02d" "$n")
    upload_blob "$container" "${container}-file-${padded}.txt" \
      "Sample content for ${container} file ${padded}. Generated for local development testing."
    n=$((n + 1))
  done
done

# Varied content-type blobs
echo "Seeding bonus blobs..."
upload_blob "reports" "quarterly-summary.pdf" "PDF placeholder content for quarterly summary report"
upload_blob "reports" "annual-metrics.csv" "date,metric,value\n2025-01-01,revenue,100000"
upload_blob "uploads" "profile-photo.jpg" "JPEG placeholder content"
upload_blob "uploads" "document-scan.pdf" "PDF placeholder content for scanned document"
upload_blob "exports" "data-export.csv" "id,name,category\n1,Widget A,hardware"
upload_blob "exports" "chart-snapshot.png" "PNG placeholder content"
upload_blob "archives" "backup-2024.tar.gz" "Archive placeholder content"
upload_blob "archives" "legacy-report.pdf" "PDF placeholder content for legacy report"

# Verify
echo ""
echo "Verifying containers..."
curl -sf "${BLOB_API}/containers"
echo ""
echo "Seeding complete: 48 blobs across 4 containers"
