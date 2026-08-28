# Azure Container Deployment & Local Testing Roadmap

This document outlines the essential preparation steps, testing strategies, and the transition plan to move the containerized backend architecture from a local development environment to Microsoft Azure.

---

## 1. Clean Up & Decouple the Code (Do This Locally First)

Before integrating actual managed Azure services, you must make the local container architecture **environment-agnostic** and validate its stability under stress:

### A. Remove Local File System Dependencies
Currently, services rely on local disk volumes to pass files between containers.
* **Action**: Rewrite the document ingestion code to use an **object storage client library** (like `boto3` for S3 or the Azure Storage SDK) instead of writing to local paths like `/app/storage/raw`.
* **Local Test**: Run a local **MinIO** container (which acts as a local S3/Object Storage mock). Verify that `ingress` uploads the document to the MinIO bucket and the background worker downloads it from MinIO to process OCR. **If this works locally, it will work on Azure Blob Storage with zero code changes.**

### B. Consolidate into a Single Base Image
* **Action**: Transition your local setup to use the **Single-Image Pattern** (creating one base Dockerfile and overriding `command` for services in `docker-compose.yml`).
* **Local Test**: Run `docker compose build` and verify that the build time falls from minutes to seconds, and that all 15 services launch and function correctly using the same image.

### C. Externalize Configuration & Secrets
* **Action**: Ensure **no credentials** are hardcoded in python files. All database URLs, Redis paths, and model endpoints must be loaded from environment variables (`os.environ`).
* **Local Test**: Verify you can run the entire local stack by changing variables only in a single local `.env` file.

---

## 2. Thorough Local Validation (The Testing Phase)

Before moving to the cloud, run these three types of local tests to ensure the setup is stable:

### A. Verification of Background Workers (Queue Checks)
* Force a processing bottleneck: Upload 50 claims containing 5-page PDFs at the same time locally.
* **Observe**:
  * Does the Celery worker queue up the jobs without crashing?
  * Do the database connection pools hold, or do you see `Connection pool exhausted` errors?
  * Does the UI state update live without drops?

### B. Run Automated Pytest in the Containers
* Run tests directly inside the docker container environment to verify that no libraries are missing or conflicting:
  ```bash
  ```bash
  docker compose run --entrypoint "pytest tests/" gateway
  ```

### C. Concurrency Stress Test (Local Load Testing)
* Run a local load-testing script using **k6** or **Locust** targeting your gateway API.
* Simulating even 50–100 concurrent uploads locally will reveal if your Postgres database setup locks up or if your Redis brokers drop tasks.

---

## 3. The Azure Production Migration Plan (Phase-by-Phase)

Once the local container setup is clean, move to Azure in three logical phases to avoid configuration overload:

```
┌────────────────────────────────────────────────────────┐
│ Phase 3: Enterprise Hardening (VNets & Key Vault)       │
├────────────────────────────────────────────────────────┤
│ Phase 2: Managed Database & Blob Storage Integration    │
├────────────────────────────────────────────────────────┤
│ Phase 1: Lift-and-Shift to Azure Container Apps (ACA)  │
└────────────────────────────────────────────────────────┘
```

### Phase 1: Lift-and-Shift (Basic Cloud Run)
1. Push your unified Docker image to **Azure Container Registry (ACR)**.
2. Deploy the container services to **Azure Container Apps (ACA)**. Keep the database and Redis running as basic container replicas inside ACA for now (using simple environment variables for configuration) to verify basic network routing.

### Phase 2: Integrate Managed Cloud Services
1. Provision **Azure Database for PostgreSQL (Flexible Server)** and migrate the database schema. Update your containers' `DATABASE_URL` to point to the managed server.
2. Provision **Azure Blob Storage**. Swap the local MinIO client endpoints to target the Azure Blob storage account.
3. Provision **Azure Cache for Redis** to replace the local Redis container.

### Phase 3: Enterprise Hardening & Security
1. **Remove Connection Strings**: Setup **Azure Managed Identities** so containers authenticate with PostgreSQL and Storage without passwords.
2. **Secure Networking**: Move all ACA containers, PostgreSQL, and Storage accounts inside an **Azure Virtual Network (VNet)**. Disable all public internet entrypoints except for the frontend gateway.
3. **Secrets**: Inject LLM keys (OpenRouter/Gemini API keys) dynamically from **Azure Key Vault** into the container environment configurations.
