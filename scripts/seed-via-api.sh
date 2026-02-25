#!/usr/bin/env bash
# Seed Azurite through the blob-service REST API (no az CLI required)
# Requires: curl, blob-service running on localhost:8081
set -e

BLOB_API="http://localhost:8081/api/blobs"

echo "Waiting for blob-service to be ready..."
for i in $(seq 1 30); do
  if curl -sf "${BLOB_API}/containers" > /dev/null 2>&1; then
    echo "blob-service is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: blob-service not reachable at ${BLOB_API} after 30s"
    exit 1
  fi
  sleep 1
done

CONTAINERS=("reports" "uploads" "exports" "archives")

upload_blob() {
  local container="$1"
  local filename="$2"
  local content="$3"

  local tmpfile
  tmpfile=$(mktemp "/tmp/${filename}.XXXXXX")
  echo "$content" > "$tmpfile"

  curl -sf -X POST "${BLOB_API}/${container}" \
    -F "file=@${tmpfile};filename=${filename}" \
    > /dev/null 2>&1 || echo "  WARN: failed to upload ${container}/${filename}"

  rm -f "$tmpfile"
}

# Seed numbered blobs per container
for container in "${CONTAINERS[@]}"; do
  echo "Seeding ${container}..."
  for i in $(seq -w 1 10); do
    upload_blob "$container" "${container}-file-${i}.txt" \
      "Sample content for ${container} file ${i}. Generated for local development testing."
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
RESULT=$(curl -sf "${BLOB_API}/containers")
echo "Containers: ${RESULT}"

TOTAL=0
for container in "${CONTAINERS[@]}"; do
  COUNT=$(curl -sf "${BLOB_API}/${container}" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  echo "  ${container}: ${COUNT} blobs"
  if [ "$COUNT" != "?" ]; then
    TOTAL=$((TOTAL + COUNT))
  fi
done

echo ""
echo "Seeding complete: ${TOTAL} blobs across ${#CONTAINERS[@]} containers"
