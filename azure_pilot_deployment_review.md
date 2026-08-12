# ClaimGPT: Azure Pilot Deployment & Database Review

This document provides a detailed evaluation of the database options and supporting infrastructure components for running the **ClaimGPT** pilot with **300 to 400 employees**. It details the cost profiles (using tentative specifications with safety buffers) and evaluates technical alignment with the existing codebase.

---

## 1. Database Tier Evaluation

The current ClaimGPT backend is tightly coupled with **PostgreSQL** due to dependencies on:
* **SQLAlchemy & Alembic Migrations:** Core migrations are written specifically for the PostgreSQL dialect.
* **JSONB Fields:** Used heavily in tables like `claims.canonical_json`, `ocr_results.tokens`, `parsed_fields.bounding_box`, and `fraud_assessments.indicators` for schema flexibility.
* **PostgreSQL Operators:** Custom queries use operators like `->>` (e.g., [main.py:L293](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L293)) to query JSON keys directly in SQL.

Here is how different Azure database options compare, all standardized at **32 GB Storage** for an equal comparison:

*   **Azure Database for PostgreSQL (Flexible Server) [Highly Recommended]:**
    *   *Code Impact:* 0% modification. Plug-and-play.
    *   *Pilot Spec:* Burstable `B2s` (2 vCores, 8 GB RAM) + **32 GB Storage** (matching your calculator spec).
    *   *Tentative Cost:* **~$53.00 / month**.
    *   *Why:* Keeps the existing SQL code working without changes. You can upgrade to General Purpose later as traffic grows.
*   **Azure SQL Database (SQL Server):**
    *   *Code Impact:* High. Requires rewriting all migrations and database queries.
    *   *Pilot Spec:* Standard S0 Tier (10 DTUs, includes up to 250 GB storage).
    *   *Tentative Cost:* **~$15.00 / month** (includes storage).
*   **Azure Cosmos DB (NoSQL):**
    *   *Code Impact:* Extremely High. Requires a complete re-architecture of the relational structure.
    *   *Pilot Spec:* Serverless + **32 GB Storage** (billing only for bytes written).
    *   *Tentative Cost:* **~$1.75 / month** (with Free Tier enabled, since the first 25 GB is free) or **~$8.00 / month** (without Free Tier).
*   **Azure Database for MySQL (Flexible Server):**
    *   *Code Impact:* Medium. Requires syntax updates for JSON queries.
    *   *Pilot Spec:* Burstable `B1ms` or `B2s` (2 vCores, 2GB or 4GB RAM) + **32 GB Storage**.
    *   *Tentative Cost:* **~$16.00 / month** (B1ms spec: $12.41 compute + $3.68 storage) or **~$29.00 / month** (B2s spec: $25.00 compute + $3.68 storage).

---

## 2. Document Format Impact: Digital PDFs vs. Scanned Images

In the codebase (see [services/ocr/app/engine.py:L1010-1020](file:///c:/Project/ClaimGPT-feature/services/ocr/app/engine.py#L1010-L1020)):
1. The engine checks if there is embedded text in the PDF.
2. If digital text exists, it sets `should_ocr = False`.
3. **Result:** For text-extractable PDFs, **no OCR models (PaddleOCR, Tesseract) are executed**. The text is extracted directly on the CPU.

### Cost Implications:
*   **GPU VM Plan:** You pay a flat monthly fee (tentatively **~$385.00/month**) for the GPU VM even if it sits completely idle.
*   **Serverless API Plan:** If digital text exists, we skip calling the Azure Document Intelligence API. The API cost for those pages is **$0.00**. You only pay standard API rates ($10 per 1,000 pages) for scanned images or photos.
*   *Since office employees primarily deal with digital PDFs, your actual API processing costs will be near-zero.*

---

## 3. Infrastructure Plan Comparison (Tentative Costs & Specs)

*Note: The costs below are tentative monthly estimates and include a **20% buffer** to cover potential regional rate variations, backups, Log Analytics, network egress, and Key Vault operations.*

### Monthly Cost & Specification Comparison

| Component | GPU VM Plan (Specs / Cost) | Serverless Plan (Specs / Cost) |
| :--- | :--- | :--- |
| **Database** | GP 2 vCore / 8GB RAM / 128GB ($145.00) | Burstable B2ms 2vc / 8GB RAM / 32GB ($103.00) |
| **Compute (API)** | VM D4v5 4vc / 16GB RAM ($145.00) | ACA Serverless 2vc / 4GB RAM / Scale-0 ($35.00) |
| **Compute (GPU)** | VM NC4as 4vc / 28GB / 16GB VRAM ($385.00) | None ($0.00) |
| **OCR Processing** | Local GPU OCR / Self-Hosted ($0.00) | Azure API Layout / PAYG (4.5k pages) ($45.00) |
| **Message Broker** | Redis C1 Cache / 1.2GB RAM ($105.00) | Service Bus Standard / 13M ops ($12.00) |
| **Storage Account** | 500GB Hot Storage / LRS ($15.00) | 50GB Pay-As-You-Go / LRS ($5.00) |
| **Container Registry**| ACR Standard Tier ($20.00) | ACR Basic Tier ($5.00) |
| **Key Vault & DNS** | Standard operations ($5.00) | Standard operations ($5.00) |
| **Bandwidth / Egress**| Outbound network charges ($5.00) | Outbound network charges ($5.00) |
| **Subtotal** | **$825.00 / month** | **$215.00 / month** |
| **Buffer (20%)** | **$165.00 / month** | **$43.00 / month** |
| **Total Cost** | **~$990.00 / month** | **~$258.00 / month** |

### Legend of Specification Terms:
*   **GP:** General Purpose tier (provisioned resources, running 24/7).
*   **Burstable B2ms:** Pricing tier selecting 2 vCores and 8 GB RAM. Billed at $99.28/month base compute + $0.115/GB storage.
*   **vc / RAM / Storage:** Number of Virtual CPU Cores / gigabytes of Memory / gigabytes of Disk storage.
*   **ACA Scale-0:** Azure Container Apps serverless compute. Automatically scales down to **0 active CPU/RAM instances** when there are no claims being processed, meaning you pay $0.00 for compute during idle times (night, weekends).
*   **PAYG:** Pay-As-You-Go billing.

---

## Appendix: Azure PostgreSQL Pricing Tiers Explained

When provisioning Azure Database for PostgreSQL, Microsoft offers three hardware performance tiers. Here is the operational comparison:

### 1. Burstable Tier (B-Series) — *Ideal for Pilots & Dev/Test*
*   **How it works:** Designed for databases with variable traffic. CPU resources are shared. When the database is idle (below a baseline), it accumulates "CPU credits." When traffic bursts, it consumes those credits to run at 100% CPU.
*   **Pro:** The most cost-effective tier (e.g. your selected `B2ms` at $99.28/mo). Perfect for proving the application logic with 300-400 employees.
*   **Risk:** If the database sustains 100% CPU utilization for too long, it exhausts its credits and gets severely throttled. This will cause slow queries and connection drops. 
*   **High Availability (HA):** Does *not* support zone-redundant High Availability standby replicas.

### 2. General Purpose Tier (D-Series) — *Standard for Production*
*   **How it works:** Fully dedicated compute resources running 24/7. Standard balance of compute and memory (**4 GB RAM per vCore**).
*   **Pro:** Consistent, guaranteed performance. Highly scalable storage with fast IOPS. Fully supports High Availability (automatic failover to a standby server in another availability zone).
*   **When to use:** When you move past the pilot phase to full production, to ensure zero-throttling under continuous claim processing.

### 3. Memory Optimized Tier (E-Series) — *For Large-Scale / Heavy Data Joins*
*   **How it works:** Fully dedicated compute with double the memory ratio (**8 GB RAM per vCore** instead of 4 GB).
*   **Pro:** Keeps very large databases and indexing files cached in RAM, maximizing query speed.
*   **When to use:** Only necessary if you are running complex vector similarity indexing, massive analytical queries, or joining millions of claims and OCR document rows simultaneously.
