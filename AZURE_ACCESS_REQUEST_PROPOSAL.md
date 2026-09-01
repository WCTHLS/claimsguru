# 📋 Azure Cloud Infrastructure & Access Request Document

**Project:** ClaimsGuru (AI-Powered Health Insurance Claims Processing Platform)  
**Target Environment:** Azure Staging (`stage`)  
**Deployment Model:** Infrastructure as Code (Azure Bicep) + Multi-Stage Container Apps  
**Requested By:** Engineering Team (`swagathreddy.k@company.com`)  

---

## 📌 Executive Summary

The ClaimsGuru platform on the `feature/azure-migration` branch is completely finalized, containerized, and cloud-ready for Microsoft Azure. The architecture uses serverless Azure AI Document Intelligence, Azure Service Bus, Azure SQL Database, Azure Cache for Redis, Azure Blob Storage, and Azure Container Apps.

To enable automated, 1-click deployment via our **Azure Bicep** templates, the engineering team requests:
1. **Subscription-Level Contributor Access** (to automatically create and manage the Resource Group `rg-claimsguru-stage`).
2. **Microsoft Entra ID App Registrations** (3 configuration values provided by the IT / Identity Team).

---

## 🔑 1. Primary Request: Azure Subscription Contributor Access

### Recommended Role: `Contributor` at the **Subscription Level**
* **Target Account:** `swagathreddy.k@company.com`
* **Role:** **Contributor**
* **Scope:** **Azure Subscription** (e.g. `Pay-As-You-Go`, `Enterprise Agreement`, or `Dev/Test Subscription`)

### Why Subscription-Level Contributor Access is Required:
* **Automated Resource Group Creation:** Allows our automated Bicep deployment script (`deploy_claimsguru_azure.ps1`) to create the staging Resource Group (`rg-claimsguru-stage`) directly without manual IT provisioning.
* **Autonomous Provisioning:** Grants write permissions to provision the 8 interconnected cloud services (Container Apps, Azure SQL, Redis, Service Bus, Storage, Document Intelligence, Key Vault, and ACR) inside the Resource Group.
* **Zero DevOps Bottleneck:** Enables rapid iteration, automated database schema migrations (`init_db.py`), and seamless CI/CD container updates.

---

## 🛡️ 2. Microsoft Entra ID (Authentication) - IT Team Request

Following standard enterprise security practice, our authentication relies on Microsoft Entra ID. The IT / Identity administrator only needs to register **two (2) client applications** and share **3 configuration values** with the engineering team:

### Values Needed from IT / Identity Admin:

| # | Value Needed | Parameter in Code | Example Format |
| :---: | :--- | :--- | :--- |
| **1** | **Company Entra Tenant ID** | `NEXT_PUBLIC_ENTRA_TENANT_ID` | `8f5201a4-366b-4d9a-aded-a8914d927938` |
| **2** | **Patient App Client ID** | `NEXT_PUBLIC_ENTRA_PATIENT_CLIENT_ID` | `1c11fa32-4232-9b46-1112-133d01002900` |
| **3** | **Org / Auditor App Client ID** | `NEXT_PUBLIC_ORG_ENTRA_CLIENT_ID` | `203b950c-7d57-4843-8ca0-e7747d889a1d` |

---

### Specifications for IT Team to Create the 2 App Registrations:

#### Application 1: Patient Portal
* **Display Name:** `claimsguru-patient-stage`
* **Application Type / Platform:** Single-Page Application (SPA) / Web
* **Redirect URIs:**
  * `http://localhost:3000/auth/callback` (Local Development)
  * `https://claimsguru-web-stage.eastus.azurecontainerapps.io/auth/callback` *(or updated once deployed)*
* **Logout URI:** `https://claimsguru-web-stage.eastus.azurecontainerapps.io/login`
* **API Permissions / Scopes:** `openid`, `profile`, `email`, `offline_access`

#### Application 2: Clinical Auditor & Organization Portal
* **Display Name:** `claimsguru-org-stage`
* **Application Type / Platform:** Single-Page Application (SPA) / Web
* **Redirect URIs:**
  * `http://localhost:3000/auth/callback`
  * `https://claimsguru-web-stage.eastus.azurecontainerapps.io/auth/callback`
* **API Permissions / Scopes:** `openid`, `profile`, `email`, `offline_access`

---

## 🏛️ Resources Provisioned Automatically in `rg-claimsguru-stage`

Once Subscription Contributor access is granted and the 3 Entra ID values are supplied, the Bicep template ([`infra/azure/main.bicep`](file:///c:/Project/ClaimGPT-feature/infra/azure/main.bicep)) automatically provisions:

```
📁 Resource Group: 'rg-claimsguru-stage'
   ├── 🚀 Azure Container Apps (Web Next.js, API Gateway, OCR Worker, Default Worker)
   ├── 📦 Azure Container Registry (ACR) (Standard)
   ├── 🧠 Azure AI Document Intelligence (S0 Tier - Serverless OCR)
   ├── 📨 Azure Service Bus (Standard - Queues: default, ocr_queue, parser_queue)
   ├── ⚡ Azure Cache for Redis (Standard C1/C2 - Ephemeral Result Store)
   ├── 🗃️ Azure SQL Database (Standard S2/S3 - Primary Schema + Connection Pooling)
   ├── 🗄️ Azure Blob Storage (Standard LRS - Encrypted 'claimgpt' Bucket)
   └── 🔐 Azure Key Vault (Standard - Hardware-backed Secret Storage)
```

---

## 🔒 Security & Compliance Assurance

* **Zero Hardcoded Secrets:** All credentials, database passwords, and connection strings are generated dynamically and stored in Azure Key Vault.
* **Cryptographic Token Validation:** FastAPI Gateway validates all JWT signatures against Microsoft Entra ID's live JWKS discovery endpoint (`/.well-known/jwks.json`).
* **HIPAA & IRDAI Compliant:** Row-level patient data partitioning (HIPAA § 164.308) and built-in 11-rule automated insurance validation.

---

## 🚀 Execution Workflow Upon Approval

1. **IT Team** creates the 2 App Registrations and provides the **Tenant ID** and **2 Client IDs**.
2. **Subscription Admin** assigns `swagathreddy.k@company.com` the **Contributor** role on the Azure Subscription.
3. **Engineering Team** updates [`infra/azure/parameters.stage.json`](file:///c:/Project/ClaimGPT-feature/infra/azure/parameters.stage.json) and triggers 1-click deployment:
   ```powershell
   az login
   az account set --subscription "<subscription-id>"
   .\deploy_claimsguru_azure.ps1 -Environment stage -Location eastus
   ```
4. Entire environment deploys in **~5 to 8 minutes** and outputs the live public URL.
