# ClaimsGuru™ Enterprise Platform
## Backend Technology Stack Specification
**Target Audience:** Marketing, Sales Enablement, Enterprise Buyers & Executive Stakeholders  
**Cloud Environment:** Microsoft Azure Cloud (Enterprise Pre-Production)  
**Document Classification:** Enterprise Confidential  

---

## 1. Executive Summary: What Powers ClaimsGuru?

**ClaimsGuru** is an intelligent health insurance claim auditing and adjudication platform built to automate reimbursement claims processing. Running natively on **Microsoft Azure**, it converts messy, scanned, multi-page hospital bills, diagnostic receipts, and discharge summaries into structured, verified, and audited expense tables.

The backend is built with an **asynchronous microservices architecture** powered by **FastAPI**, **Celery**, and **Azure Cache for Redis**. Claim extraction leverages direct parallel calls to **Azure OpenAI GPT-4o** alongside **Azure AI Document Intelligence** for computer vision table parsing, delivering lightning-fast turnaround times with complete mathematical accuracy.

---

## 2. Enterprise Value Pillars

| Value Pillar | Marketing Pitch & Enterprise Client Benefit |
|---|---|
| **⚡ High-Throughput Async Engine** | Processes multi-page hospital bills simultaneously with zero UI lag using distributed Celery background workers and in-memory Redis message queues. |
| **🎯 Precision Extraction** | Combines Azure Document Intelligence layout analysis with Azure OpenAI GPT-4o parallel semantic parsing to extract complex hospital tariffs and line items accurately. |
| **🛡️ Bank-Grade Security & Isolation** | Protected with Microsoft Entra External ID (OAuth2/OIDC), private Azure Virtual Networks, and hardware-backed Azure Key Vault secret encryption. |
| **📈 Elastic Cloud Scalability** | Containerized microservices running on Azure Container Apps with automated autoscaling based on incoming claim traffic volumes. |

---

## 3. Verified Backend Technology Stack Specifications

*All specifications below reflect the active codebase and live pre-production Azure environment:*

### A. Core Runtime, Web API & Asynchronous Queues
* **Primary Runtime:** Python 3.11+ (Debian Bookworm slim container base)
* **API Gateway & Framework:** **FastAPI (v0.128.8)** — asynchronous, low-latency REST endpoints handling claim lifecycle, document uploads, and real-time status polling.
* **ASGI Server Engine:** **Uvicorn (v0.39.0)** with **uvloop (v0.21.0)** — high-performance event loop built for enterprise multi-tenancy.
* **Distributed Task Queue:** **Celery (v5.4.0)** — asynchronous distributed worker pool for multi-stage OCR and AI audit pipelines.
* **In-Memory Cache & Message Broker:** **Azure Cache for Redis (redis v5.2.1)** — millisecond state synchronization for real-time progress bars, claim session caching, and task queuing.
* **Enterprise Event Bus:** **Azure Service Bus (SDK v7.14.0)** — fault-tolerant, guaranteed message delivery between ingress and worker nodes.
* **Data Contracts & Typing:** **Pydantic (v2.12.5)** & `pydantic-settings` — strict request/response data validation and schema integrity.

### B. Database & Object Storage
* **Relational Database:** **Azure SQL Database (Microsoft SQL Server)** — ACID-compliant transactional persistence for claims, hospital registries, line items, and audit findings.
* **Database Drivers & Pooling:** SQLAlchemy 2.0.48 with `pyodbc` / `pymssql` (Pool size: 10, Max Overflow: 15).
* **Schema Migrations:** **Alembic (v1.18.4)** — automated, version-controlled database schema updates.
* **Secure Document Lake:** **Azure Blob Storage (StorageV2 - Hot Tier)** — private, encrypted blob containers storing raw claim PDFs, scanned bills, and generated audit report PDFs.

### C. Generative AI, OCR & Computer Vision
* **Generative AI / LLM:** **Azure OpenAI Service (GPT-4o, API 2024-11-20)** — direct asynchronous REST integration for semantic table parsing, clinical entity extraction, and rate-limit backoff.
* **Cloud OCR & Computer Vision:** **Azure AI Document Intelligence (Form Recognizer v3.3.0 / API 2023-07-31)** — deep layout analysis, bounding box extraction, and multi-page table detection for Indian hospital bills.
* **Digital PDF Parsing & Rasterizing:** `PyMuPDF (fitz v1.25.3)` and `pdfplumber (v0.11.4)` — high-speed text extraction, DPI-optimized rendering, and vector line detection.
* **Medical Semantic Search:** **FAISS Vector Index (`faiss-cpu v1.9.0`)** + **BM25 (`rank-bm25 v0.2.2`)** for instant ICD-10 and procedure code lookup.
* **Predictive ML:** `XGBoost (v2.0+)` and `LightGBM (v4.0+)` for claim approval probability and duplicate claim anomaly detection.

### D. Identity, Security & Cloud Services
* **Identity & Access Management (IAM):** **Microsoft Entra External ID (CIAM / Azure AD B2C)** — enterprise OAuth 2.0 / OpenID Connect (OIDC) Single Sign-On with RS256 JWT validation (`PyJWT`, `python-jose`).
* **Secrets Vault:** **Azure Key Vault** — hardware-backed HSM protection for connection strings, API keys, and sensitive tokens.
* **Email Notifications:** **Azure Communication Services (ACS Email)** — automated transactional dispatch of claim audit completion notifications.
* **Audit Report Generation:** **WeasyPrint (v63+)** + **Jinja2** / `fpdf2` — pixel-perfect, print-ready PDF audit reports.

---
*Verification Note: All technologies, libraries, and cloud services in this document reflect the active codebase and live deployment in the claimsGuru Microsoft Azure pre-production environment.*
