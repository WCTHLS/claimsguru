# ClaimsGuru Setup Guide (Docker Container Stack)

Follow these steps to pull, cleanly build from scratch, and run the complete ClaimsGuru platform on your local machine.

---

> [!IMPORTANT]
> **Branch**: Ensure you are on the feature branch containing the latest LLM integration, medical coding enhancements, and identity check features:
> ```powershell
> git fetch origin
> git checkout feat/llm-integration-identity-check
> ```

---

## 1. Environment Configuration

1. Place your `.env` file in the project root (or copy `.env.example`):
   ```powershell
   Copy-Item -Path ".env.example" -Destination ".env"
   ```
2. Open `.env` and verify the required Azure OpenAI & AI service keys:
   ```env
   AZURE_OPENAI_ENDPOINT="https://cg-preprod-openai.openai.azure.com/openai/v1"
   AZURE_OPENAI_API_KEY="<your-azure-openai-key>"
   AZURE_OPENAI_DEPLOYMENT="gpt-4o"
   AZURE_OPENAI_API_VERSION="2024-11-20"
   OCR_USE_AZURE_OCR="True"
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="<your-docintel-endpoint>"
   AZURE_DOCUMENT_INTELLIGENCE_KEY="<your-docintel-key>"
   ```

---

## 2. One-Command Build & Run from Scratch (Recommended)

To cleanly remove old container caches, build fresh container images, initialize the database, and launch all services in one step:

```powershell
.\run_local_containers.ps1 -Rebuild
```

### What this script performs automatically:
1. **Starts Infrastructure**: Launches SQL Server 2022 (`mssql-db:1433`) and Redis (`redis:6379`).
2. **Initializes Database**: Creates the `claimgpt` database and auto-provisions tables/roles via `init_db.py`.
3. **Builds Container Images**: Compiles `claimsguru-core:test` (FastAPI backend + Celery workers) and `claimsguru-frontend:test` (Next.js 15 UI).
4. **Launches Microservice Stack**:
   * `claimsguru-api-test` (API Gateway on **Port 8000**)
   * `claimsguru-worker-ocr` (Celery OCR Worker)
   * `claimsguru-worker-default` (Celery Default/Parser/Coding Worker)
   * `claimsguru-web-test` (Next.js Dashboard on **Port 3000**)

---

## 3. Manual Step-by-Step Setup (Alternative)

If you prefer building and running containers manually:

### Step A: Stop existing containers
```powershell
docker compose -p claimgpt-feature -f infra/docker/docker-compose.yml down
docker rm -f claimsguru-api-test claimsguru-worker-ocr claimsguru-worker-default claimsguru-web-test 2>$null
```

### Step B: Build images from scratch without cache
```powershell
docker build --no-cache -t claimsguru-core:test -f infra/docker/Dockerfile.core .
docker build --no-cache -t claimsguru-frontend:test -f infra/docker/Dockerfile.web .
```

### Step C: Run the automated launch script
```powershell
.\run_local_containers.ps1
```

---

## 4. Platform Access URLs

| Component | URL | Description |
|---|---|---|
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | Full claims auditor UI, document upload & reimbursement brain |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI for all 11 microservices |
| **SQL Server** | `localhost:1433` | Host: `localhost`, User: `sa`, Password: `YourStrong!Password`, DB: `claimgpt` |
| **Redis** | `localhost:6379` | Celery broker & task results |

---

## 5. Stopping the Stack

```powershell
.\run_local_containers.ps1 -Stop
```

---

## 6. Running Automated Tests

Run the full coding, RAG retrieval, and LLM diagnosis keyword extraction test suite:

```powershell
docker exec claimsguru-worker-default pytest /app/tests/coding/
```

---

## 7. Key Features in this Branch

* **LLM Clinical Context Correlation**: Generic diagnoses (e.g. `"Infectious disease - medical management"`) correlate with clinical evidence (prescribed medications like Remdesivir/Tocilizumab/Baricitinib, ICU consumables, oxygen support) to extract specific ICD-10 codes (`B97.2` / `U07.1` / `U07.2` Coronavirus) without false HIV/unrelated fallbacks.
* **Category Deduplication & Ranking**: Filters out redundant ICD-10 fuzzy variants when explicit codes exist on documents, prioritizing 100% authoritative matches.
* **Total Amount IRDAI Validation**: Supports `claimed_total`, `claimed_amount`, and `total_amount` to prevent false missing amount warnings.
* **Modern TPA PDF Dossier**: High-resolution executive audit report generated via WeasyPrint with accurate gross/net calculations and itemized expense tables.


