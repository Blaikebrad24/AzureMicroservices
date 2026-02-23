# Backend API Testing Guide

This document covers testing all three Spring Boot microservice endpoints locally using `curl` against Docker Compose.

---

## Prerequisites

### 1. Start the Application

```bash
docker compose up --build -d
```

All 10 containers must be running. Verify with:

```bash
docker compose ps
```

### 2. Service Port Mappings

| Service | Internal Port | Host Port | Base URL |
|---------|--------------|-----------|----------|
| blob-service | 8080 | **8081** | `http://localhost:8081` |
| reports-service | 8080 | **8082** | `http://localhost:8082` |
| data-service | 8080 | **8083** | `http://localhost:8083` |

### 3. Health Checks

Verify each service is healthy before testing:

```bash
curl -s http://localhost:8081/actuator/health | python3 -m json.tool
curl -s http://localhost:8082/actuator/health | python3 -m json.tool
curl -s http://localhost:8083/actuator/health | python3 -m json.tool
```

Expected: `{ "status": "UP", ... }` with Redis showing `UP` for all three.

### 4. Seed Azurite Blob Storage

The blob-service requires test data in Azurite. The seed script is at:

```
scripts/seed-azurite.sh
```

It creates **108 blobs** across 4 containers:

| Container | Contents |
|-----------|----------|
| `reports` | 25 text files + `quarterly-summary.pdf`, `annual-metrics.csv` |
| `uploads` | 25 text files + `profile-photo.jpg`, `document-scan.pdf` |
| `exports` | 25 text files + `data-export.csv`, `chart-snapshot.png` |
| `archives` | 25 text files + `backup-2024.tar.gz`, `legacy-report.pdf` |

**Option A** -- If Azure CLI is installed locally:

```bash
bash scripts/seed-azurite.sh
```

**Option B** -- Via Docker (no local install required):

```bash
CONN_STR="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1"

docker run --rm --network completeazureapp_app-network mcr.microsoft.com/azure-cli \
  bash -c "
    CONN='$CONN_STR'
    for c in reports uploads exports archives; do
      az storage container create --name \$c --connection-string \"\$CONN\" --output none 2>/dev/null
      for i in \$(seq -w 1 25); do
        tmpfile=\$(mktemp)
        echo \"Sample content for \${c} file \${i}.\" > \"\$tmpfile\"
        az storage blob upload --container-name \"\$c\" --name \"\${c}-file-\${i}.txt\" \
          --file \"\$tmpfile\" --content-type text/plain \
          --connection-string \"\$CONN\" --overwrite --output none 2>/dev/null
        rm -f \"\$tmpfile\"
      done
      echo \"Seeded \$c with 25 blobs\"
    done
  "
```

---

## Blob Service (`localhost:8081`)

### GET /api/blobs/containers

List all blob storage containers.

```bash
curl -s http://localhost:8081/api/blobs/containers | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
["archives", "exports", "reports", "uploads"]
```

---

### GET /api/blobs/{container}

List all blobs in a specific container.

```bash
curl -s http://localhost:8081/api/blobs/reports | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
[
  {
    "name": "annual-metrics.csv",
    "containerName": "reports",
    "contentLength": 70,
    "contentType": "text/csv",
    "lastModified": "2026-02-22T20:17:56Z",
    "metadata": null
  },
  ...
]
```

---

### GET /api/blobs/paginated

Paginated list with sorting, filtering, and cross-container search.

**Parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `0` | Page number (zero-indexed) |
| `size` | `20` | Items per page |
| `sortBy` | `lastModified` | Sort field: `name`, `contentLength`, `contentType`, `containerName`, `lastModified` |
| `sortDir` | `desc` | Sort direction: `asc`, `desc` |
| `container` | *(all)* | Filter to a specific container |
| `search` | *(none)* | Case-insensitive substring match on blob name |

**All containers, page 0, size 5:**

```bash
curl -s "http://localhost:8081/api/blobs/paginated?page=0&size=5" | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "content": [
    {
      "name": "legacy-report.pdf",
      "containerName": "archives",
      "contentLength": 42,
      "contentType": "application/pdf",
      "lastModified": "2026-02-22T20:17:58Z",
      "metadata": null
    }
  ],
  "totalElements": 108,
  "totalPages": 22,
  "number": 0,
  "size": 5,
  "first": true,
  "last": false
}
```

**Filtered by container + search:**

```bash
curl -s "http://localhost:8081/api/blobs/paginated?container=reports&search=quarterly&size=5" | python3 -m json.tool
```

**Sorted by name ascending:**

```bash
curl -s "http://localhost:8081/api/blobs/paginated?sortBy=name&sortDir=asc&size=3" | python3 -m json.tool
```

---

### GET /api/blobs/{container}/{blob}/metadata

Get metadata for a specific blob.

```bash
curl -s http://localhost:8081/api/blobs/reports/quarterly-summary.pdf/metadata | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "name": "quarterly-summary.pdf",
  "containerName": "reports",
  "contentLength": 53,
  "contentType": "application/pdf",
  "lastModified": "2026-02-22T20:17:55Z",
  "metadata": {}
}
```

---

### GET /api/blobs/{container}/{blob}

Download a blob. Returns the file bytes with proper content headers.

```bash
curl -s -D - http://localhost:8081/api/blobs/exports/data-export.csv
```

**Expected Response** (200 OK):
```
HTTP/1.1 200
Content-Disposition: attachment; filename="data-export.csv"
Content-Type: text/csv
Content-Length: 57

id,name,category
1,Widget A,hardware
2,Widget B,software
```

Save to a file:

```bash
curl -s -o downloaded.csv http://localhost:8081/api/blobs/exports/data-export.csv
```

---

### POST /api/blobs/{container}

Upload a file to a container. Creates the container if it doesn't exist.

```bash
echo "Test upload content" > /tmp/test-upload.txt
curl -s -X POST -F "file=@/tmp/test-upload.txt" http://localhost:8081/api/blobs/uploads | python3 -m json.tool
rm -f /tmp/test-upload.txt
```

**Expected Response** (200 OK):
```json
{
  "blobName": "test-upload.txt",
  "containerName": "uploads",
  "url": "http://azurite:10000/devstoreaccount1/uploads/test-upload.txt",
  "contentLength": 20
}
```

Upload to a new container (auto-created):

```bash
echo "New container test" > /tmp/new-file.txt
curl -s -X POST -F "file=@/tmp/new-file.txt" http://localhost:8081/api/blobs/my-new-container | python3 -m json.tool
rm -f /tmp/new-file.txt
```

---

### DELETE /api/blobs/{container}/{blob}

Delete a blob.

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE http://localhost:8081/api/blobs/uploads/test-upload.txt
```

**Expected Response:** `HTTP 204` (No Content)

---

### Upload + Delete Round-Trip Test

```bash
# Upload
echo "Round-trip test" > /tmp/roundtrip.txt
curl -s -X POST -F "file=@/tmp/roundtrip.txt" http://localhost:8081/api/blobs/uploads | python3 -m json.tool

# Verify it exists
curl -s http://localhost:8081/api/blobs/uploads/roundtrip.txt/metadata | python3 -m json.tool

# Delete
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE http://localhost:8081/api/blobs/uploads/roundtrip.txt

# Verify it's gone (expect 500 - blob not found)
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8081/api/blobs/uploads/roundtrip.txt/metadata

rm -f /tmp/roundtrip.txt
```

---

### Redis Cache Verification

The blob-service caches blob listings in Redis with a 10-minute TTL.

```bash
# First call - cache miss (slower)
curl -s -o /dev/null -w "Time: %{time_total}s\n" "http://localhost:8081/api/blobs/paginated?page=0&size=10"

# Second call - cache hit (faster)
curl -s -o /dev/null -w "Time: %{time_total}s\n" "http://localhost:8081/api/blobs/paginated?page=0&size=10"
```

Flush the cache manually if needed:

```bash
docker exec redis redis-cli -a redispassword FLUSHALL
```

---

## Reports Service (`localhost:8082`)

### POST /api/reports/generate

Generate a new report. The report is created with `PENDING` status and processed asynchronously.

```bash
curl -s -X POST http://localhost:8082/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Report Q1",
    "type": "csv",
    "parameters": {"month": "january", "region": "north"}
  }' | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "name": "Sales Report Q1",
  "type": "csv",
  "status": "PENDING",
  "parameters": {"month": "january", "region": "north"},
  "resultPath": null,
  "errorMessage": null,
  "generatedAt": null,
  "createdAt": "2026-02-22T20:30:00Z",
  "updatedAt": "2026-02-22T20:30:00Z"
}
```

---

### GET /api/reports

List all reports.

```bash
curl -s http://localhost:8082/api/reports | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Sales Report Q1",
    "type": "csv",
    "status": "COMPLETED",
    ...
  }
]
```

---

### GET /api/reports/{id}

Get a specific report by ID.

```bash
curl -s http://localhost:8082/api/reports/1 | python3 -m json.tool
```

---

### GET /api/reports/{id}/status

Check only the status of a report (lightweight poll endpoint).

```bash
curl -s http://localhost:8082/api/reports/1/status | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "id": "1",
  "status": "COMPLETED"
}
```

---

### Reports Full Lifecycle Test

```bash
# 1. Generate
REPORT_ID=$(curl -s -X POST http://localhost:8082/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Report","type":"pdf","parameters":{"year":"2025"}}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created report: $REPORT_ID"

# 2. Poll status (may transition from PENDING -> PROCESSING -> COMPLETED)
sleep 2
curl -s "http://localhost:8082/api/reports/$REPORT_ID/status" | python3 -m json.tool

# 3. Get full report details
curl -s "http://localhost:8082/api/reports/$REPORT_ID" | python3 -m json.tool

# 4. List all reports
curl -s http://localhost:8082/api/reports | python3 -m json.tool
```

---

## Data Service (`localhost:8083`)

### POST /api/data

Create a new data entity.

```bash
curl -s -X POST http://localhost:8083/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Widget Alpha",
    "description": "Primary component for assembly line",
    "category": "hardware",
    "metadata": {"sku": "WA-001", "warehouse": "east"}
  }' | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "name": "Widget Alpha",
  "description": "Primary component for assembly line",
  "category": "hardware",
  "metadata": {"sku": "WA-001", "warehouse": "east"},
  "createdAt": "2026-02-22T20:30:00Z",
  "updatedAt": "2026-02-22T20:30:00Z"
}
```

---

### GET /api/data

List data entities with pagination and sorting.

**Parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `0` | Page number (zero-indexed) |
| `size` | `20` | Items per page |
| `sort` | `createdAt` | Sort field and direction (e.g., `name,asc`) |

```bash
curl -s "http://localhost:8083/api/data?page=0&size=10" | python3 -m json.tool
```

**With custom sorting:**

```bash
curl -s "http://localhost:8083/api/data?page=0&size=5&sort=name,asc" | python3 -m json.tool
```

**Expected Response** (200 OK):
```json
{
  "content": [
    {
      "id": 1,
      "name": "Widget Alpha",
      "description": "Primary component for assembly line",
      "category": "hardware",
      "metadata": {"sku": "WA-001", "warehouse": "east"},
      "createdAt": "2026-02-22T20:30:00Z",
      "updatedAt": "2026-02-22T20:30:00Z"
    }
  ],
  "pageable": { ... },
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 10,
  "first": true,
  "last": true
}
```

---

### GET /api/data/{id}

Get a specific entity by ID.

```bash
curl -s http://localhost:8083/api/data/1 | python3 -m json.tool
```

---

### PUT /api/data/{id}

Update an existing entity.

```bash
curl -s -X PUT http://localhost:8083/api/data/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Widget Alpha v2",
    "description": "Updated component specs",
    "category": "hardware",
    "metadata": {"sku": "WA-002", "warehouse": "west"}
  }' | python3 -m json.tool
```

---

### DELETE /api/data/{id}

Delete an entity.

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE http://localhost:8083/api/data/1
```

**Expected Response:** `HTTP 204` (No Content)

---

### GET /api/data/search

Search entities by name (case-insensitive substring match).

| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Search query string |
| `page` | No | Page number (default: 0) |
| `size` | No | Items per page (default: 20) |

```bash
curl -s "http://localhost:8083/api/data/search?q=widget&page=0&size=10" | python3 -m json.tool
```

---

### Data Service CRUD Lifecycle Test

```bash
# 1. Create
ENTITY_ID=$(curl -s -X POST http://localhost:8083/api/data \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Entity","description":"For testing","category":"test","metadata":{"key":"value"}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created entity: $ENTITY_ID"

# 2. Read
curl -s "http://localhost:8083/api/data/$ENTITY_ID" | python3 -m json.tool

# 3. Update
curl -s -X PUT "http://localhost:8083/api/data/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Entity","description":"Modified","category":"test","metadata":{"key":"new-value"}}' \
  | python3 -m json.tool

# 4. Search
curl -s "http://localhost:8083/api/data/search?q=Updated" | python3 -m json.tool

# 5. Delete
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X DELETE "http://localhost:8083/api/data/$ENTITY_ID"

# 6. Verify deletion (expect 500 or 404)
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:8083/api/data/$ENTITY_ID"
```

---

## Troubleshooting

### Service won't start

Check logs for the specific service:

```bash
docker compose logs blob-service --tail 50
docker compose logs reports-service --tail 50
docker compose logs data-service --tail 50
```

### Redis connection issues

Verify Redis is healthy and accessible:

```bash
docker exec redis redis-cli -a redispassword PING
```

### Azurite API version mismatch

If you see `InvalidHeaderValue` errors referencing an unsupported API version, ensure the Azurite container command includes `--skipApiVersionCheck`:

```yaml
command: azurite --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0 --skipApiVersionCheck
```

### Stale Redis cache

If endpoints return stale data or serialization errors after code changes:

```bash
docker exec redis redis-cli -a redispassword FLUSHALL
docker compose restart blob-service reports-service data-service
```

### Database not initialized

Reports and data services depend on PostgreSQL. The init scripts at `database/init/` create the required databases. If tables are missing:

```bash
docker compose restart postgres
# Wait for healthy, then restart dependent services
docker compose restart reports-service data-service
```
