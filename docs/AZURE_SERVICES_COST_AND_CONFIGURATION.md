# ClaimsGuru - Azure Services, Configurations & Cost Breakdown

> **Environment**: Pre-Production (`cg-preprod`)  
> **Resource Group**: `claimsGuru`  
> **Primary Region**: Central India (`centralindia`)  

---

## 1. Compute Services (Azure Container Apps)

| Service Name | Role in Application | vCPU | Memory | Replicas (Min / Max) | Port / Concurrency | Monthly Cost Estimate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`cg-preprod-cin-worker-ocr`** | Celery worker for `ocr_queue` (Document OCR ingestion) | **1.0 vCPU** | **2.0 GiB** | Min: 1 / Max: 8 *(CPU > 75%)* | `-c 2` (2 concurrent tasks) | **~$23.60 / mo** |
| **`cg-preprod-cin-worker-default`** | Celery worker for `default` & `parser_queue` (NLP coding, validation, risk) | **1.0 vCPU** | **2.0 GiB** | Min: 1 / Max: 6 *(CPU > 75%)* | `-c 2` (2 concurrent tasks) | **~$23.60 / mo** |
| **`cg-preprod-cin-ingress`** | FastAPI HTTP API Gateway (Auth, uploads, claim lifecycle) | **1.0 vCPU** | **2.0 GiB** | Min: 1 / Max: 10 *(HTTP > 25 req)* | Port 8000 (External HTTP) | **~$23.60 / mo** |
| **`cg-preprod-cin-frontend`** | Next.js Web Frontend (Auditor UI dashboard) | **0.5 vCPU** | **1.0 GiB** | Min: 1 / Max: 5 *(HTTP > 30 req)* | Port 3000 (External HTTP) | **~$11.80 / mo** |
| **`cg-preprod-cin-redis`** | In-cluster Redis 7 (Celery message broker & result backend) | **0.5 vCPU** | **1.0 GiB** | Min: 1 / Max: 1 | Port 6379 (Internal TCP) | **~$11.80 / mo** |

*Note: Container Apps compute includes active processing usage plus 24/7 idle warm capacity ($0.000003/vCPU-s and $0.000003/GiB-s).*

---

## 2. Database & Storage Services

| Service / Resource Name | Service Type | Tier / SKU | Current Specifications | Pricing Model | Monthly Cost Estimate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`cg-preprod-sql-vvekhbufuteq2`**<br>*(Database: `claimsguru`)* | Azure SQL Database | **Standard S1** | • **20 DTUs**<br>• Max 60 concurrent workers<br>• Max 250 GB storage | Flat monthly tier | **~$30.00 / mo** |
| **`acrclaimsgurupreprod`** | Azure Container Registry | **Basic** | • **10 GiB included storage**<br>• Current storage: ~4.17 GB | Flat base rate ($0.167/day) | **~$5.00 / mo** |
| **`cgpreprodstvvekhbufuteq2`** | Azure Storage Account | **Standard_LRS** | • Hot access tier<br>• Blob storage for uploaded claim files | Pay-As-You-Go per GB | **<$1.00 / mo** |

---

## 3. AI & Cognitive Services

| Service / Resource Name | Service Type | Model / Tier | Current Specifications | Pricing Model | Monthly Cost Estimate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`cg-preprod-openai`** | Azure OpenAI Service | **Standard S0** | • Model: `gpt-4o` (2024-11-20)<br>• Global deployment | Pay-As-You-Go per token:<br>• $2.50 / 1M input tokens<br>• $10.00 / 1M output tokens | **~$8.00 – $10.00 / mo**<br>*(Based on current volume)* |
| **`cg-preprod-docintel-vvekhbufuteq2`** | Azure Document Intelligence | **Standard S0** | • Feature: Prebuilt Layout / Read<br>• High-accuracy optical OCR | Pay-As-You-Go per page:<br>• $1.50 per 1,000 pages | **~$3.50 – $5.00 / mo**<br>*(Based on current volume)* |

---

## 4. Supporting Cloud Services

| Service / Resource Name | Service Type | Tier / SKU | Current Specifications | Monthly Cost Estimate |
| :--- | :--- | :--- | :--- | :--- |
| **`cg-preprod-sb-vvekhbufuteq2`** | Azure Service Bus | **Standard** | • Queues: `default`, `ocr_queue`, `parser_queue`, `dead_letter` | **~$0.10 / mo** |
| **`cg-preprod-cin-law`** | Log Analytics Workspace | **PerGB2018** | • 30-day retention<br>• Centralized log ingestion | **~$0.20 / mo** |
| **`cg-preprod-kv-vvekhbufut`** | Azure Key Vault | **Standard** | • RBAC secret management | **<$0.05 / mo** |
| **`cg-preprod-comm`** / **`cg-preprod-email`** | Communication & Email | **PAYG** | • Azure-managed domain for transactional emails | **<$0.05 / mo** |
| **Bandwidth** | Egress Data Transfer | **Standard** | • Outbound internet traffic | **~$1.00 / mo** |

---

## 5. Total Consolidated Monthly Cost

| Category | Included Services | Estimated Monthly Cost | % of Total Spend |
| :--- | :--- | :--- | :--- |
| **Container Compute** | OCR Worker, Default Worker, Ingress, Frontend, Redis | **~$94.40** | **65.4%** |
| **Database** | Azure SQL Database (Standard S1 - 20 DTUs) | **~$30.00** | **20.8%** |
| **Container Registry** | Azure Container Registry (Basic Tier - 10 GiB) | **~$5.00** | **3.5%** |
| **AI Models & OCR** | Azure OpenAI (GPT-4o) + Document Intelligence | **~$12.50** | **8.7%** |
| **Storage & Platform** | Storage Account, Service Bus, Logs, Bandwidth | **~$2.35** | **1.6%** |
| **TOTAL** | **All claimsGuru pre-prod services combined** | **~$144.25 / mo** | **100%** |

---
---

## 6. High-Concurrency Auto-Scaling & Cost Safeguards

* **Smart Auto-Scaling for Workers (On-Demand Only):**  
  Active CPU rules (`cpu-scale` at 75% load) on `worker-ocr` (up to 8 replicas) and `worker-default` (up to 6 replicas). Workers scale out automatically when documents are uploaded and scale back down to 1 when idle.  
  *(Cost impact: **$0 extra fixed cost** — billed only for active processing seconds during spikes).*

* **Traffic-Based Auto-Scaling for Frontend & API:**  
  HTTP concurrency rules on `frontend` (30 request threshold, up to 5 replicas) and `ingress` (25 request threshold, up to 10 replicas) to guarantee fast page loads for 300–400 concurrent users without paying for idle warm replicas.

* **Database Connection Guard (Zero Cost Increase):**  
  Connection pool tuned (`DB_POOL_SIZE=3`, `DB_MAX_OVERFLOW=5`) so total connections stay safely below Azure SQL Standard S1's 60-connection limit even across multiple scaled API replicas.  
  *(Cost impact: **$0 increase** — keeps database safely on the $30/month tier).*
