# ClaimGPT — Azure Deployment, Cost, & Dependency Review

This review analyzes the Azure Infrastructure Cost Estimate provided in your spreadsheet, details how Python dependencies are distributed across microservices and Celery workers, and provides a side-by-side comparison of the local stack versus the proposed Azure production deployment.

---

## 1. Analysis of Your Azure Cost Estimate & Unit Economics

Your manager-facing cost spreadsheet is structured professionally and clearly demonstrates how **fixed cloud overhead is absorbed as claim volume scales**. Here is an architectural review of the SKUs and pricing models:

### SKU & Capacity Evaluation
* **Virtual Machines (GPU Worker - NC4as T4 v3)**: This VM provides 1x NVIDIA T4 (16GB VRAM) and is designated for PaddleOCR, DocLayoutV3, and BioBERT. This is a solid, cost-effective GPU instance. However, running a GPU instance 24/7 under Pay-As-You-Go is expensive ($989.98/month). Purchasing a **3-Year Reserved Instance ($180.68/month)** represents an **81% cost reduction** and is highly recommended if you plan to keep AI models self-hosted.
* **Virtual Machines (API/Web Server - D4 v5)**: 4 vCPUs and 16GB RAM is an excellent size for running the FastAPI gateway, web ingress, and frontend.
* **Azure Database for PostgreSQL (Flexible Server - 2 vCore, 8GB RAM)**: A good general-purpose starting tier. As traffic grows, you can easily scale the vCores or memory with zero code modifications.
* **Azure Cache for Redis (Standard Tier - C1)**: 1.2GB RAM is more than enough to handle Celery queue messaging and fast API caches for up to 2,500 active users.

### Crucial Math Observation for Your Manager
> [!IMPORTANT]
> **Total Cost Discrepancy**: 
> Summing the listed Pay-As-You-Go (PAYG) column rows (Row 5 to 10) yields **$1,403.76/month**, but the spreadsheet's "Total Fixed Base Infrastructure Cost" (Row 14) is listed as **$797.76/month**. 
>
> **Explanation**: The total of **$797.76** is likely calculated by using the **1-Year Reserved price for the GPU Worker ($280.65)** while keeping the other items on Pay-As-You-Go ($140.16 + $141.44 + $100.74 + $11.44 + $20.00 = $413.78 + $280.65 = $694.43, plus tax/buffer). 
> 
> If you purchase **3-Year Reserved Instances** for the GPU worker, API VM, Database, and Redis, your actual base monthly cost drops to **$389.90/month**, making the unit economics even more favorable:
> * **100 Active Users**: ~$3.90 / user / month
> * **1,000 Active Users**: ~$0.39 / user / month

### Architect's Cost-Reduction Tip: Serverless AI
If you replace the self-hosted GPU worker VM with **Azure AI Document Intelligence (OCR)** and **Azure OpenAI Service (GPT-4o-mini)**, you can **eliminate the GPU VM ($989/mo PAYG or $180/mo Reserved) entirely**. 
* Instead of paying a fixed cost for an idle GPU, you pay purely on a **per-use basis** (e.g., $10 per 1,000 pages processed). 
* This drops your fixed baseline cost to around **$200/month (3-Yr Reserved)**, shifting your AI costs to a purely variable operational expense (OpEx).

---

## 2. Dependency Distribution & Celery Worker Operations

### Dependency Isolation in `docker-integrated`
In the base `feature/docker-integrated` branch, dependencies are **fully isolated by service**.
* Each folder in `services/` contains its own `requirements.txt` (e.g. [services/ocr/requirements.txt](file:///c:/Project/ClaimGPT-feature/services/ocr/requirements.txt) has PaddleOCR and PyTorch; [services/coding/requirements.txt](file:///c:/Project/ClaimGPT-feature/services/coding/requirements.txt) has SciSpacy).
* The [Dockerfile.service](file:///c:/Project/ClaimGPT-feature/infra/docker/Dockerfile.service) references `SERVICE_NAME` to install only that specific service's requirements. This keeps container images lightweight (e.g., the `predictor` image does not contain PaddleOCR or SciSpacy).

### Do Celery Workers Need Dependencies?
**Yes, absolutely.**
Celery workers do not just pass messages; **they execute the actual Python code**. 
* The FastAPI HTTP servers (`ocr`, `parser`, etc.) are lightweight wrappers. When a user uploads a claim, the HTTP server writes metadata to the DB, enqueues a Celery task, and immediately returns a `202 Accepted` status.
* The background **Celery workers** then fetch the task and run the processing.
* Therefore, the **workers must have the exact packages installed**:
  * `ocr_worker` uses [Dockerfile.ocr](file:///c:/Project/ClaimGPT-feature/infra/docker/Dockerfile.ocr) and requires `services/ocr/requirements.txt` to run PaddleOCR and Tesseract.
  * `parsing_worker` and `other_worker` use `Dockerfile.service` with `SERVICE_NAME: workflow` to run extraction scripts and coordinate downstream models.

### Celery Workers on Azure
**Yes, we will use Celery workers in Azure.** 
Under high concurrent loads (thousands of users), parsing and OCR must run asynchronously to prevent gateway timeouts.
* **Deployment in Azure**: We will deploy the FastAPI endpoints as web-facing containers and the Celery workers as separate, non-routing background containers in **Azure Container Apps (ACA)**.
* **Auto-scaling (KEDA)**: In ACA, we configure KEDA to monitor the Redis queue length. If no claims are uploaded, worker containers can scale down to **0 copies** (saving money). When a batch upload occurs, ACA dynamically scales up the worker count (e.g., to 15 containers) to process claims in parallel.

---

## 3. Side-by-Side Architectural Mapping

Below is the side-by-side comparison of the tools and services used in the local `docker-integrated` stack versus the scalable Azure production stack:

| Service / Component | Local Dev Stack (`docker-integrated`) | Azure Production Stack |
| :--- | :--- | :--- |
| **Ingress Service** | FastAPI Container, local directory storage (`./storage/raw`) | Azure Container Apps (ACA), **Azure Blob Storage** (Hot Tier) |
| **OCR Service / Worker** | Tesseract + PaddleOCR (CPU-bound Python Celery worker) | Azure Container Apps (with GPUs) OR **Azure AI Document Intelligence** (Serverless cloud API - *Recommended*) |
| **Parser Service / Worker** | OpenAI/Gemini API calls OR local Ollama instances | Azure Container Apps + **Azure OpenAI Service (GPT-4o-mini)** (Enterprise private endpoints) |
| **Coding Service** | local SciSpacy pipeline + FAISS/BM25 pickle indexing | Azure Container Apps + **Azure AI Search** (for managed vector storage & hybrid search queries) |
| **Predictor Service** | XGBoost / LightGBM loaded into memory | Azure Container Apps (loaded in-memory) OR **Azure Machine Learning Online Endpoint** |
| **Fraud Service** | Python IsolationForest + Rule Check scripts | Azure Container Apps |
| **Validator Service** | Python logical rules engine (R001–R011) | Azure Container Apps |
| **Submission Service** | WeasyPrint + FPDF libraries to generate PDFs | Azure Container Apps |
| **Chat & Search Services** | LangGraph agent + Local FAISS vector index files | Azure Container Apps + **Azure AI Search** |
| **Message Broker (Celery)** | Redis (v5.2.1 container) | **Azure Cache for Redis** (Standard/Premium clustered) |
| **Primary Database** | PostgreSQL container | **Azure Database for PostgreSQL (Flexible Server)** (HA + Read Replica) |
| **Identity & Access** | Keycloak container (local SQLite dev database) | Keycloak container on ACA (backed by Azure SQL/Postgres) OR **Azure AD B2C** |
| **Telemetry / Monitoring** | Prometheus & Grafana containers | **Azure Monitor** (Application Insights + Log Analytics) |

---

## 4. Frontend B2C Dashboard Adjustment (Send to TPA)

Per your instructions, the **"Send to TPA" button will not be hidden** in the B2C Patient Portal. Instead, we will preserve the button in the claims interface to represent the upcoming feature. 

### Planned Frontend Experience:
When a patient clicks the **Send to TPA** button:
1. Instead of showing the active TPA directory selector modal, the system will render a user-friendly alert banner or toast:
   > **Electronic TPA Submission**
   > 
   > Direct submission to registered TPAs is currently in pilot. This feature will be active shortly for your insurance provider. Please download the compiled IRDA Form and submit it manually in the meantime.
2. The interactive submission inputs inside the modal will be disabled, preventing raw endpoint failures while maintaining a clean, feature-complete UI.
