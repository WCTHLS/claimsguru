# Enterprise Azure Deployment, Security & Scalability Audit

This document presents a comprehensive, code-level architectural and DevOps evaluation of the `feature/azure-migration` branch in the **ClaimGPT** backend workspace ([`ClaimGPT-feature`](file:///c:/Project/ClaimGPT-feature)). 

This analysis is based directly on the codebase (`libs/auth/`, `libs/shared/`, `services/ingress/app/main.py`, and `infra/docker/docker-compose.yml`) and defines the steps required to transition this system into a secure, fault-tolerant, and highly scalable enterprise cloud application on **Microsoft Azure**.

---

## 1. Cloud-Native Database Architecture (Azure SQL Database)

### A. Driver Transition: `pymssql` to `pyodbc`
*   **Current Code Design**: The local Docker setup utilizes `mssql+pyodbc` in the compose configuration, but the config base in [`libs/shared/config.py`](file:///c:/Project/ClaimGPT-feature/libs/shared/config.py) defaults to PostgreSQL.
*   **Production Standard**: For Azure SQL Database deployment, the Python code must standardise on the `pyodbc` dialect combined with the **Microsoft ODBC Driver for SQL Server** (which we already install in the Docker image core stage).
*   **Managed Identities**: Instead of hardcoding credentials like `sa:YourStrong!Password`, enable **System-Assigned Managed Identity** on the Azure Container Apps. The connection string should use Entra token authentication:
    ```ini
    DATABASE_URL=mssql+pyodbc://<sql-server-name>.database.windows.net/claimgpt?driver=ODBC+Driver+18+for+SQL+Server&Authentication=ActiveDirectoryMsi&Encrypt=yes&TrustServerCertificate=no
    ```

### B. Connection Pool Safeguards
*   **Current Code Design**: The database engines in [`libs/shared/db.py`](file:///c:/Project/ClaimGPT-feature/libs/shared/db.py#L88) default to `pool_size=5` and `max_overflow=10`.
*   **The Issue on Azure**: In a scaled Azure Container Apps environment (e.g., 20 API replicas + 20 worker replicas), this opens up to $40 \times 15 = 600$ concurrent database connections. Serverless or burstable Azure SQL Database tiers will throttle traffic or drop connections under this load.
*   **Remediation**: Expose connection pool boundaries to environment variables, clamping them for worker replicas (e.g. `DB_POOL_SIZE=2`, `DB_MAX_OVERFLOW=2`).

---

## 2. Object Storage & Direct Ingress Architecture

### A. Native Azure Blob Storage Integration
*   **Current Code Design**: In [`libs/shared/storage.py`](file:///c:/Project/ClaimGPT-feature/libs/shared/storage.py), the S3-compatible client (`MinioStorage`) wraps `boto3` for MinIO.
*   **Production Standard**: Implement an `AzureBlobStorage` class using the official `azure-storage-blob` SDK. Swapping the client at runtime based on `AZURE_STORAGE_CONNECTION_STRING` or Azure credential objects prevents relying on S3-compatibility wrappers.

### B. Ephemeral Disk Bypass (Direct-to-Blob Uploads)
*   **Current Ingress Flow**: 
    1. Browser sends document bytes to [`POST /claims`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L1485).
    2. Ingress writes files to local temporary disk paths (`/app/storage/raw`).
    3. Files are uploaded to S3 (MinIO) and the local disk is cleaned up.
*   **The Issue on Azure**: Azure Container Apps run on ephemeral filesystems. Heavy multi-part uploads lock up container memory and disk IO, creating a scale bottleneck.
*   **Production Standard**:
    1. Implement a `/claims/upload-token` API route that generates a pre-signed **Shared Access Signature (SAS) URL**.
    2. Next.js UI uploads document bytes directly to Azure Blob Storage using the SAS URL.
    3. The UI notifies Ingress, passing only the Blob storage metadata (URL, file name, size). This removes file byte transfers from the application container compute boundaries.

---

## 3. Vector Search & RAG Architecture (Azure AI Search)

### A. Replacing Local FAISS & BM25 Indices
*   **Current Code Design**: In [`services/coding/app/icd10_rag.py`](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L58), the RAG module loads `SentenceTransformer` (`pritamdeka/S-PubMedBert-MS-MARCO`) locally and queries index files (`icd10_index.faiss`, `icd10_bm25.pkl`).
*   **The Issue on Azure**: Loading a 500MB+ embedding model inside every scaled worker replica consumes high RAM (often 1GB+ per process) and CPU compute, slowing container start-up times.
*   **Production Standard**: Migrate RAG data to **Azure AI Search** (formerly Azure Cognitive Search):
    *   Create an Azure AI Search index supporting hybrid search (lexical BM25 + vector search).
    *   Call Azure OpenAI's embedding API (`text-embedding-3-small`) to generate query vectors.
    *   Query the Azure AI Search endpoint via HTTP. This slims worker container footprints and offloads embedding calculations to managed APIs.

---

## 4. Fault Tolerance, Queues & Observability

### A. Swapping the Broker to Azure Service Bus
*   **Current Code Design**: Celery tasks are coordinated using Redis.
*   **The Issue on Azure**: Redis queues are volatile. If the Redis cache node restarts, all queued document jobs are lost.
*   **Production Standard**: Switch the Celery broker to **Azure Service Bus (Premium)** using the `celery-servicebus` transport wrapper, ensuring durable message delivery and native dead-letter queuing.

### B. Azure Monitor & Application Insights
*   **Current Code Design**: Telemetry is bound to local Prometheus/Grafana containers.
*   **Production Standard**: Install `opencensus-ext-azure` in the Python Docker base, routing all logs, trace metrics, and exception dumps directly to an Azure Log Analytics workspace.
