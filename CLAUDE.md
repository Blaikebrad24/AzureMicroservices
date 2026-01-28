# CLAUDE.md - AI Collaboration Documentation

This document describes the collaborative development process between a human developer and Claude (Anthropic's AI assistant) in building the Complete Azure Container App monorepo.

---

## Project Genesis

This project represents the consolidation of multiple production-grade patterns that the developer had previously implemented across separate repositories at work. The goal was to combine these proven architectures into a single, deployable monorepo that could:

1. Run locally via Docker Compose for development and demonstration
2. Deploy to Azure Container Apps via Terraform for production workloads
3. Replace an on-premises OIDC provider with Keycloak for portability

---

## The Human Element

The developer brought real-world experience from building each component independently:

- **Nginx reverse proxy patterns** with `auth_request` for centralized authentication
- **OIDC Authorization Code Flow** implementations for enterprise SSO
- **Spring Boot microservices** with Redis caching and PostgreSQL persistence
- **Next.js applications** with server-side rendering and role-based access
- **Terraform modules** for Azure infrastructure provisioning
- **CI/CD pipelines** with path-filtered builds for monorepo efficiency

The challenge: these components existed in isolation. The vision was a cohesive, demonstrable architecture.

---

## Claude's Contribution

Claude (Opus 4.5) served as an implementation partner, translating requirements into working code through iterative collaboration.

### Planning Phase

Starting from the developer's `Planning.md` document, Claude:

1. **Asked clarifying questions** to understand architectural decisions:
   - Single vs. multiple microservices → Multiple (blob, reports, data)
   - Database choices → PostgreSQL + Azurite + stubbed Snowflake
   - Frontend framework → Next.js 15 with pnpm
   - IaC tool → Terraform (not Bicep)
   - Role structure → Admin, Editor, Viewer

2. **Proposed the dual-OIDC approach** when the developer mentioned wanting both Flask OIDC proxy (primary) and lua-resty-openidc (reference implementation):
   > "I would like to default using Python-Flask OIDC, but I would also like to create the lua-resty-openidc functionality but comment it out. I think it will be useful to show how that is done, I could use it as an update patch to my on-prem build."

3. **Created a comprehensive implementation plan** covering 10 phases (0-9) with clear deliverables for each.

### Implementation Phase

Claude wrote the complete codebase across 138 files:

#### Services Created
| Service | Language/Framework | Files | Purpose |
|---------|-------------------|-------|---------|
| nginx-proxy | Nginx 1.27 | 6 | TLS termination, auth_request routing |
| flask-oidc-proxy | Python/Flask | 10 | OIDC Authorization Code Flow |
| keycloak | Keycloak 26.0 | 2 | Identity provider with custom realm |
| blob-service | Java/Spring Boot | 11 | Azure Blob Storage operations |
| reports-service | Java/Spring Boot | 12 | Async report generation |
| data-service | Java/Spring Boot | 11 | Generic CRUD with caching |
| frontend | TypeScript/Next.js | 19 | Dashboard with Server Actions |

#### Infrastructure
- **8 Terraform modules**: networking, acr, container-app-environment, container-app, postgres, redis, storage-account, keyvault
- **3 GitHub Actions workflows**: CI (path-filtered), CD-staging (auto), CD-production (manual)
- **4 shell scripts**: setup-local.sh, generate-certs.sh, seed-azurite.sh, wait-for-it.sh

### Debugging Phase

During local testing, Claude identified and fixed issues:

1. **TypeScript strict mode errors** in Next.js:
   - `let blobs;` → `let blobs: BlobMetadata[] = [];`
   - `let data;` → `let data: Page<DataEntity> | null = null;`

2. **Jackson serialization errors** for Java 8 date/time types:
   - Created `JacksonConfig.java` for all three Spring Boot services
   - Configured `JavaTimeModule` for proper `OffsetDateTime` serialization
   - Updated `RedisConfig.java` to use the configured ObjectMapper

3. **Verified end-to-end functionality**:
   - All 10 containers starting with correct dependency ordering
   - OIDC flow redirecting properly to Keycloak
   - Backend APIs returning proper JSON responses
   - Redis caching working as expected

---

## The Collaboration Model

This project demonstrates an effective human-AI collaboration pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HUMAN DEVELOPER                          │
│  • Domain expertise from production systems                     │
│  • Architectural vision and requirements                        │
│  • Quality validation and testing                               │
│  • Strategic decisions on trade-offs                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Requirements & Feedback
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLAUDE (AI)                             │
│  • Clarifying questions to understand intent                    │
│  • Code generation across multiple languages                    │
│  • Pattern implementation (OIDC, caching, auth)                 │
│  • Debugging and iterative fixes                                │
│  • Documentation and README creation                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Working Code
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETE APPLICATION                       │
│  • 10 Docker containers                                         │
│  • 138 source files                                             │
│  • 9,500+ lines of code                                         │
│  • Full CI/CD pipeline                                          │
│  • Terraform infrastructure                                     │
└─────────────────────────────────────────────────────────────────┘
```

### What Worked Well

1. **Starting with a planning document**: The developer's `Planning.md` provided enough context for Claude to ask targeted questions rather than making assumptions.

2. **Iterative clarification**: Instead of guessing, Claude asked about specific decisions (microservice count, roles, auth approach) which led to better alignment.

3. **Phase-based implementation**: Breaking the work into 10 phases allowed for incremental progress and validation.

4. **Real-time debugging**: When the Docker build failed, Claude could analyze logs, identify the issue, and implement fixes.

### Key Learnings

- **Human expertise remains essential**: Claude implemented patterns but the developer knew *which* patterns to use from production experience.
- **AI accelerates, doesn't replace**: What might take days of boilerplate writing happened in hours, but design decisions required human judgment.
- **Documentation as communication**: The planning document and README served as shared context between human and AI.

---

## Technical Highlights

### Dual Keycloak URL Pattern

One interesting challenge was handling Keycloak URLs in Docker networking:

```python
# Flask OIDC Proxy - config.py
KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://keycloak:8080")  # Internal
KEYCLOAK_PUBLIC_URL = os.environ.get("KEYCLOAK_PUBLIC_URL", "http://localhost:8080")  # Browser
```

- **Internal URL** (`http://keycloak:8080`): Used for server-to-server token exchange
- **Public URL** (`http://localhost:8080`): Used for browser redirects

This pattern is common in containerized environments but easy to overlook.

### lua-resty-openidc Reference Implementation

Per the developer's request, Claude created a fully documented but disabled OpenResty configuration:

```nginx
# services/nginx-proxy/conf/conf.d/lua-oidc.conf.disabled

# This file contains a complete, working lua-resty-openidc implementation
# that can replace the Flask OIDC proxy. It's disabled by default but
# serves as a reference for on-premises deployments where OpenResty
# is preferred over a separate auth proxy container.
```

This provides an upgrade path for the developer's on-premises systems.

### Server Actions Pattern

The Next.js frontend uses Server Actions exclusively for API communication:

```typescript
// services/frontend/src/actions/data-actions.ts
"use server";

export async function listData(page = 0, size = 20): Promise<Page<DataEntity>> {
  return apiGet(`/api/data?page=${page}&size=${size}`, "data-service");
}
```

Benefits:
- No API keys exposed to browser
- Type safety end-to-end
- Simplified error handling
- Reduced client bundle size

---

## Files Generated by Claude

```
Total files: 138
Total lines of code: ~9,500

By language:
├── Java (Spring Boot)      ~3,200 lines
├── TypeScript (Next.js)    ~1,800 lines
├── Python (Flask)          ~800 lines
├── HCL (Terraform)         ~1,500 lines
├── YAML (Docker/CI)        ~1,200 lines
├── SQL                     ~150 lines
├── Nginx Config            ~300 lines
└── Shell Scripts           ~200 lines
```

---

## Conclusion

This project demonstrates that AI can serve as an effective implementation partner when:

1. The human provides clear architectural direction
2. The AI asks clarifying questions rather than assuming
3. Both parties iterate on feedback
4. The human validates the output against production requirements

The result is a complete, working application that neither party could have produced as efficiently alone—the human brings production wisdom, the AI brings implementation velocity.

---

*Built collaboratively by Blaike Bradford and Claude (Opus 4.5)*
*January 2026*
