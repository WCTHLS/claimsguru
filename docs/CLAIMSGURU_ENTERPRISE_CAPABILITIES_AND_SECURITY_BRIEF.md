# ClaimsGuru — Enterprise Solution, Capabilities & Security Brief
**Smarter Claims. Faster Care. Intelligent Health Insurance Adjudication.**

---

## 1. Executive Summary

### The Industry Challenge
Health insurance reimbursement in India is historically fraught with friction:
- **Long Turnaround Times**: Average reimbursement takes **15 to 30 days** due to physical document collection, manual data entry, and postal delays.
- **High Technical Rejection Rates**: Over **18% of claims** face queries or outright rejection due to preventable errors—such as missing mandatory bills, misidentified patients, illegible doctor prescriptions, or unseparated non-payable consumables.
- **Administrative Burden**: Hospital front desks, TPAs (Third-Party Administrators), and patients spend hours manually filling multi-page IRDAI forms and computing non-payable deductions.

### The ClaimsGuru Solution
**ClaimsGuru** (developed by WaferWire Cloud Technologies) is an enterprise-grade, AI-assisted health insurance claim intake, review, and adjudication workspace. It bridges patients, healthcare providers, and insurers with:
1. **Intelligent Document Ingestion & OCR**: High-accuracy extraction across handwritten, photographed, and scanned medical bills and summaries.
2. **Fail-Fast Identity & Fraud Gate**: Consensus-based patient identity matching across documents before submission to eliminate wrong-patient rejections.
3. **Autonomous Clinical & Tariff Engine**: Automated ICD-10 medical coding, itemized deduction separation, and tariff limit evaluation.
4. **Automated IRDAI Form & Dossier Generation**: Instant generation of standardized IRDAI reimbursement forms with digital signature pads.
5. **Private Enterprise AI**: 100% cloud-isolated processing—no patient health records (PHI/PII) are ever exposed to public AI systems.

---

## 2. Feature & Capability Matrix

| Feature Area | Capabilities & Specifications | Business / Operational Benefit |
| :--- | :--- | :--- |
| **Multi-Format Document Intake** | • Ingests PDF, JPEG, PNG, TIFF, and camera photos up to 25 MB.<br/>• Built-in mobile camera scanner with automatic border detection, perspective correction, and contrast enhancement.<br/>• Set-based SHA-256 fingerprinting prevents accidental duplicate submissions. | Accommodates physical paper bills and digital hospital exports seamlessly. |
| **Automated Document Categorization** | • Machine learning classifier categorizes uploaded files into:<br/>&nbsp;&nbsp;- *Final Hospital Itemized Bill*<br/>&nbsp;&nbsp;- *Discharge Summary*<br/>&nbsp;&nbsp;- *Pharmacy Bills & Prescriptions*<br/>&nbsp;&nbsp;- *Diagnostic / Lab / Radiology Reports*<br/>&nbsp;&nbsp;- *Payment Receipts / Advance Vouchers*<br/>&nbsp;&nbsp;- *KYC / Aadhaar / PAN / Insurance Health Cards* | Eliminates manual sorting; enforces mandatory document checklists upfront. |
| **Fail-Fast Identity Gate** | • Cross-document consensus algorithm extracts and matches patient name, gender, and date of birth across all files.<br/>• Advanced filtering removes hospital, clinic, and doctor names to avoid false-positive mismatches.<br/>• On subsequent document uploads, cleanly isolates and purges only the single mismatched file without endangering already-validated records. | Prevents insurer rejection caused by mixed-up family member or stranger documents. |
| **Deep OCR & Vision Extraction** | • Multi-engine OCR pipeline combining Tesseract, OpenCV, and cloud document intelligence.<br/>• Extracts both printed and cursive doctor notes, tabular invoice line items, tax summaries, and registration IDs.<br/>• Medical scan detector identifies presence of CT, X-Ray, MRI, and Ultrasound imaging. | Accurately captures complex tabular hospital bills with hundreds of line items. |
| **Autonomous Clinical NER & ICD-10 Coding** | • Biomedical Named Entity Recognition (NER) extracts chief complaints, procedures, and secondary comorbidities.<br/>• Automatically maps medical terminology to standard **ICD-10-CM** (diagnoses) and **CPT** (procedures) codes. | Standardizes clinical terminology for instant TPA auditor review. |
| **Itemized Deductions & Tariff Engine** | • Classifies expenses into standard categories (Room Rent, ICU, OT/Surgery, Anaesthesia, Pharmacy, Consumables).<br/>• Identifies non-payable consumables (gloves, PPE, syringes, administrative fees) in accordance with IRDAI guidelines.<br/>• Estimates net approved payable amount vs. gross billed total. | Provides transparency to patients; eliminates surprise deduction disputes. |
| **Predictive Adjudication & Risk Scoring** | • Dual-engine gradient boosting (XGBoost + LightGBM) trained on historical claim patterns.<br/>• Predicts approval probability score (0–100%) and highlights top potential rejection triggers before submission. | Allows users and desk staff to rectify claim defects before filing with the TPA. |
| **Standardized IRDAI Claim Form & Digital Signature** | • Auto-populates standard IRDAI Claim Form (Part A & Part B).<br/>• In-browser digital signature pad for touchscreens and mice.<br/>• Exports complete audit-ready claim dossiers in PDF format. | Transforms a 45-minute paperwork process into a 60-second digital review. |
| **Universal TPA & Insurer Routing** | • Native support for leading insurers and TPAs (Star Health, Care, HDFC ERGO, ICICI Lombard, Niva Bupa).<br/>• **Universal "Other" TPA Adapter**: Allows routing to any custom insurance company or TPA in India with custom policy validation. | Complete flexibility across all public and private health insurers. |
| **Missing Document Workflow (`DOCUMENTS_REQUESTED`)** | • When an insurer/reviewer requests additional bills or records, the claim automatically transitions to `DOCUMENTS_REQUESTED`.<br/>• Real-time notifications alert the patient with the specific missing documents requested.<br/>• One-click incremental upload appends new documents and re-evaluates the pipeline. | Eliminates long claim stalls; keeps the claim lifecycle active until full settlement. |
| **Role-Based Portals** | • **Patient Reimbursement Portal**: Simple self-service portal for patients.<br/>• **Hospital / TPA Auditor Review Console**: Deep clinical dashboard for audit teams with source-document highlight and manual override.<br/>• **Admin Console**: User management, organization assignment, and audit trail analytics. | Supports B2C direct patient usage, hospital desk workflows, and insurer review teams. |

---

## 3. Technical & System Architecture Brief

ClaimsGuru is built on a modern, event-driven, cloud-native microservices architecture designed for high throughput, fault tolerance, and strict data isolation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                           │
│   Next.js 15 Web Portal  │  Hospital Review Console  │  Mobile Scanner │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / TLS 1.3 (Entra ID Auth)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       GATEWAY & INGRESS SERVICE                        │
│   • Request Validation & Rate Limiting                                 │
│   • Set-Based SHA-256 Fingerprinting                                   │
│   • Synchronous File Storage Intake                                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Enqueue Jobs
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DISTRIBUTED CELERY ASYNC ENGINE                     │
│                                                                        │
│  [ ocr_queue ]      ──► Step 1: Text & Table Extraction                │
│  [ parser_queue ]   ──► Step 2: Identity Gate & Field Normalization    │
│  [ default_queue ]  ──► Step 3: Clinical NER & ICD-10 Coding           │
│  [ default_queue ]  ──► Step 4: Financial Prediction & Risk Model      │
│  [ default_queue ]  ──► Step 5: IRDAI Compliance & Adjudication Rules │
│  [ default_queue ]  ──► Step 6: Dossier Finalization & Notifications   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼─────────────┐   ┌──────────────▼───────────────────┐
│       DATABASE & STORAGE        │   │        INTELLIGENCE & CACHE      │
│  • Azure SQL Server (Managed)   │   │  • Redis 7 In-Memory Broker      │
│  • MinIO / Azure Blob (Storage) │   │  • Dedicated Private LLM Engine  │
│  • Full Audit Logs & Metadata   │   │  • Azure Communication Services  │
└─────────────────────────────────┘   └──────────────────────────────────┘
```

### Key Architectural Highlights
1. **Queue Isolation & SLA Protection**:
   - High-compute tasks (OCR, layout parsing) run on dedicated Celery queues (`ocr_queue`, `parser_queue`) with isolated workers.
   - Fast transactional tasks (intake, validation, notifications) run on `default_queue`, ensuring UI responsiveness never degrades during large document OCR.
2. **State Machine & Failure Recovery**:
   - Every claim is governed by an explicit state machine (`UPLOADED` &rarr; `OCR_IN_PROGRESS` &rarr; `PARSING` &rarr; `DOCUMENTS_REQUESTED` &rarr; `COMPLETED` / `SUBMITTED`).
   - Tasks feature exponential backoff retry policies and soft/hard time limits to guarantee zero orphan processes.
3. **Database Integrity & Foreign Key Safeguards**:
   - Built on Azure SQL Server with ACID-compliant transactions.
   - Child relationship cascading ensures that if a mismatched document is deleted, all dependent analysis, validation, and OCR rows are cleaned without schema lockups.

---

## 4. Security, Privacy & Regulatory Compliance Brief

Healthcare information requires the highest level of regulatory care. ClaimsGuru is architected around the principle of **Zero-Trust Private Health Processing**.

### A. Private AI Guarantee (No Public Data Leakage)
- **Zero Third-Party Model Exposure**: All OCR, machine learning models, and parsing engines execute inside **private, customer-managed cloud infrastructure**.
- **No Training on Patient Data**: Uploaded medical bills, lab results, and patient identifiers are **never used to train public commercial AI models**.
- **Data Isolation**: Each tenant/organization operates with isolated database scopes and dedicated storage prefixes.

### B. Encryption & Data Protection
- **Encryption in Transit**: All communication between client applications, API gateways, and microservices is enforced via **TLS 1.3 / HTTPS** with forward secrecy.
- **Encryption at Rest**: All databases, storage volumes, and document archives use **AES-256 bit encryption** (Azure Transparent Data Encryption / Encrypted Blob Storage).
- **Transient Memory Cleanup**: Processed temporary files and local swap buffers are deleted upon task completion.

### C. Regulatory Standards Alignment
- **Digital Personal Data Protection (DPDP) Act, 2023 (India)**:
  - Supports user consent verification, purpose limitation, and the right to data erasure (one-click full claim and document purge).
  - Patient personal identifiers (name, mobile, email) are shielded behind authentication boundaries.
- **IRDAI (Insurance Regulatory and Development Authority of India)**:
  - Generates standardized IRDAI reimbursement annexures (Part A & Part B).
  - Complies with IRDAI non-payable item standardization (Schedule I–IV expenses).
- **HIPAA Privacy & Security Rules (Global Best Practice)**:
  - Automated logging filters mask sensitive PHI (Protected Health Information) from standard application logs.
  - Role-Based Access Control (RBAC) restricts claim viewing to authorized patients, verified organization auditors, and admins.

### D. Identity, Access & Auditability
- **Enterprise Single Sign-On (SSO)**: Powered by **Microsoft Entra ID (Azure AD)** with multi-factor authentication (MFA) and secure JWT RS256 token verification.
- **Immutable Audit Logging**: Every system action—including document uploads, identity gate rejections, field updates, reviewer overrides, and submission dispatches—is permanently logged in `dbo.audit_logs` with timestamps, actor IDs, and IP metadata.

---

## 5. Enterprise ROI & Business Value Comparison

| Dimension | Traditional Manual Claim Filing | Generic Insurer Web Portals | ClaimsGuru AI Workspace |
| :--- | :--- | :--- | :--- |
| **Claim Preparation Time** | 2 to 4 days (physical form filling & bill compilation) | 45 to 60 minutes per claim | **Under 3 minutes** (automated scan & extraction) |
| **Technical Rejection Rate** | 15% – 22% (missing bills, name typos, illegible entries) | 10% – 14% (basic validation only) | **Under 3%** (pre-submission validation & identity gate) |
| **Deduction Transparency** | Zero upfront visibility; unexpected cuts in final payout | Basic list of excluded items | **Item-by-item breakdown** with IRDAI category tagging |
| **Supported Insurers** | Restricted to paper forms by mail | Locked to a single insurance company | **Universal routing** (Star Health, ICICI, Care, HDFC, + any TPA via "Other") |
| **Compliance & Security** | Paper copies easily lost or misfiled | Data stored on proprietary servers | **Private Cloud AI**, Entra ID Auth, AES-256 encryption |

---

## 6. Deployment & Integration Options

ClaimsGuru is built for turnkey enterprise deployment:
- **Cloud-Hosted (SaaS)**: Hosted on Microsoft Azure (Azure Container Apps, Azure SQL, Azure Service Bus).
- **On-Premise / Private Cloud (Hybrid)**: Fully deployable via Docker Compose / Kubernetes into a hospital’s or insurer’s private Virtual Private Cloud (VPC).
- **RESTful API Integration**: Ready-to-use API endpoints for Electronic Health Record (EHR), Hospital Information Systems (HIS), and core insurance policy administration systems.

---
*Document Version: 2.1 | WaferWire Cloud Technologies (WCT) | Enterprise Product & Security Office*
