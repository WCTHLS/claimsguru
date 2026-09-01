# 🚀 ClaimsGuru Azure Cloud Migration & Architecture Guide

This guide documents the enterprise cloud architecture for **ClaimsGuru** on **Microsoft Azure** (`azure-migration` branch), explaining how the system scales, how team members can run it locally with 1 command, and how to deploy to Azure staging/production.

---

## 🏛️ Cloud Architecture Overview

ClaimsGuru is architected as high-throughput, cloud-native microservices running on **Azure Container Apps**:

```mermaid
graph TD
    subgraph ClientLayer["1. Client Layer"]
        Browser["Patient & Auditor Browsers"]
    end

    subgraph AzureFrontend["2. Web Presentation Layer"]
        WebPortal["claimsguru-web (Next.js 14 Container App)"]
    end

    subgraph AzureGateway["3. API Ingress Gateway"]
        APIGateway["claimsguru-ingress-api (FastAPI Gateway)"]
    end

    subgraph AzureMessaging["4. Messaging & In-Memory State"]
        ServiceBus["Azure Service Bus (Queues: default, ocr_queue, parser_queue)"]
        RedisCache["Azure Cache for Redis (Result Backend & State)"]
    end

    subgraph AzureWorkers["5. Async Processing Layer"]
        WorkerOCR["claimsguru-worker-ocr (Celery Worker: ocr_queue)"]
        WorkerDefault["claimsguru-worker-default (Celery Worker: parser_queue, default)"]
    end

    subgraph AzureDataAI["6. Data, Storage & AI Services"]
        BlobStore["Azure Blob Storage (Encrypted S3-compatible blobs)"]
        DocIntelligence["Azure AI Document Intelligence (OCR & Table Extraction)"]
        SQLDatabase["Azure SQL Database (Master Claims & Compliance Schema)"]
        KeyVault["Azure Key Vault (Secrets & Encryption Keys)"]
    end

    Browser -->|HTTPS| WebPortal
    Browser -->|REST API| APIGateway
    Browser -.->|Direct SAS Upload| BlobStore
    APIGateway -->|Enqueues Tasks| ServiceBus
    ServiceBus --> WorkerOCR
    ServiceBus --> WorkerDefault
    WorkerOCR --> DocIntelligence
    WorkerOCR & WorkerDefault --> RedisCache
    WorkerOCR & WorkerDefault --> SQLDatabase
    APIGateway --> SQLDatabase
    APIGateway --> KeyVault
```

---

## 📦 Container Packaging Strategy (2 Multi-Stage Images)

To make builds fast, lightweight, and maintainable, the entire system is packaged into **only 2 container images**:

| Dockerfile | Image Tag | Contents & Responsibilities |
| :--- | :--- | :--- |
| [`infra/docker/Dockerfile.core`](file:///c:/Project/ClaimGPT-feature/infra/docker/Dockerfile.core) | `claimsguru-core` | Unified Python 3.11-slim runtime with Microsoft ODBC 18, WeasyPrint, and all backend microservices. Runs the **API Gateway**, **OCR Worker**, **Parser Worker**, and **Default Worker**. |
| [`infra/docker/Dockerfile.web`](file:///c:/Project/ClaimGPT-feature/infra/docker/Dockerfile.web) | `claimsguru-frontend` | Next.js 14 App Router on `node:20-alpine` with Microsoft Entra ID (CIAM) authentication client. Serves the web UI. |

---

## 💻 Developer Guide: Running Locally for Team Members

Team members do **not** need to manually run 5 separate `docker run` commands with complex arguments.

### Option 1: 1-Click PowerShell Helper (Recommended)
From the project root:

```powershell
# Start all services (SQL Server, Redis, API, Workers, Frontend)
.\run_local_containers.ps1

# To rebuild after code changes:
.\run_local_containers.ps1 -Rebuild

# To stop all running containers:
.\run_local_containers.ps1 -Stop
```

### Option 2: Local Development Workflow (Hot Reloading)
For teammates actively editing UI code or Python scripts:

```powershell
# 1. Start background database & redis
docker compose -f infra/docker/docker-compose.yml up -d mssql-db redis

# 2. Run Python backend locally
python -m uvicorn main:app --reload --port 8000

# 3. Run Frontend UI locally
cd ui/web
npm run dev
```

---

## ☁️ Cloud Deployment Guide (Azure Staging / Production)

Deploying to Azure uses Infrastructure as Code (**Azure Bicep**) and automated ACR build/deployment.

### Prerequisites:
* Azure CLI installed (`az`)
* An Azure Subscription with Contributor/Owner rights

### 1-Click Azure Cloud Deployment:
```powershell
# 1. Login to Azure
az login

# 2. Set active subscription
az account set --subscription "<your-subscription-id>"

# 3. Execute automated cloud deployment
.\deploy_claimsguru_azure.ps1 -Environment stage -Location eastus
```

### What `deploy_claimsguru_azure.ps1` Automates:
1. **Compiles Bicep Infrastructure**: Compiles [`infra/azure/main.bicep`](file:///c:/Project/ClaimGPT-feature/infra/azure/main.bicep).
2. **Provisions Azure Cloud Resources**:
   - Azure Container Apps Managed Environment
   - Azure Storage Account (`claimgpt` container)
   - Azure Service Bus (queues: `default`, `ocr_queue`, `parser_queue`, `dead_letter`)
   - Azure Cache for Redis
   - Azure SQL Database Server
   - Azure AI Services Document Intelligence (`S0` tier)
   - Azure Key Vault
3. **Builds & Pushes Cloud Images**: Builds `claimsguru-core` and `claimsguru-frontend` directly in Azure Container Registry (ACR).
4. **Deploys Cloud Container Apps**:
   - `claimsguru-web` (Frontend Next.js)
   - `claimsguru-ingress-api` (FastAPI Gateway)
   - `claimsguru-worker-ocr` (Autoscaling OCR worker)
   - `claimsguru-worker-default` (Autoscaling Coding & Parser worker)
5. **Initializes Database**: Runs database schema migrations on the Azure SQL Database.

---

## 🔐 Environment Variables Reference

| Variable | Description | Example (Cloud) | Example (Local Dev) |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Primary SQL Database | `mssql+pyodbc://...@<server>.database.windows.net:1433/claimsguru?driver=ODBC+Driver+18+for+SQL+Server` | `mssql+pymssql://sa:YourStrong!Password@localhost:1433/claimgpt` |
| `REDIS_URL` | Redis Cache & Celery Results | `rediss://:<key>@<server>.redis.cache.windows.net:6380/0` | `redis://localhost:6379/4` |
| `AZURE_SERVICEBUS_CONNECTION_STRING` | Task Queue Broker | `Endpoint=sb://<namespace>.servicebus.windows.net/...` | (Trial or Redis fallback) |
| `AZURE_STORAGE_CONNECTION_STRING` | Document Storage | `DefaultEndpointsProtocol=https;AccountName=...` | (Azure Storage or MinIO) |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | AI Document Intelligence | `https://<resource>.cognitiveservices.azure.com/` | `https://...` |
| `NEXT_PUBLIC_ENABLE_ENTRA_ID` | Microsoft Entra CIAM | `true` | `true` |
| `NEXT_PUBLIC_ENTRA_PATIENT_CLIENT_ID` | Patient App Client ID | `<guid>` | `<guid>` |
| `NEXT_PUBLIC_ORG_ENTRA_CLIENT_ID` | Org Admin Client ID | `<guid>` | `<guid>` |
