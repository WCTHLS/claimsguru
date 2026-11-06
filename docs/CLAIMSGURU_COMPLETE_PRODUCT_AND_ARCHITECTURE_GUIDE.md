# ClaimsGuru™ — Complete Product, Architecture & Onboarding Guide
*Published by WaferWire Cloud Technologies (WCT) | Microsoft Azure Cloud Architecture*

---

## 1. Executive Overview: What is ClaimsGuru?

**ClaimsGuru** is an enterprise-grade, AI-powered health insurance claim intake, audit, and adjudication platform developed by **WaferWire Cloud Technologies (WCT)**. Built natively on **Microsoft Azure**, it automates the historically manual, error-prone, and fragmented health insurance reimbursement workflow in India.

ClaimsGuru ingests raw, messy, scanned medical documents—such as handwritten discharge summaries, multi-page tabular hospital bills, pharmacy invoices, and diagnostic lab reports—and autonomously transforms them into structured, mathematically validated, and IRDAI-compliant insurance claim dossiers in under 3 minutes.

### The Core Mission
To eliminate paper friction, prevent unfair claim rejections, protect patient data privacy with zero-egress private AI, and accelerate health insurance reimbursement from **weeks to minutes**.

---

## 2. The Problem in the Indian Health Insurance Ecosystem

Health insurance reimbursement in India is historically fraught with friction for patients, hospital billing desks, and Third-Party Administrators (TPAs):

1. **Protracted Turnaround Times (15 to 30 Days):**
   - Patients physically compile dozens of paper bills, receipts, and reports.
   - Physical courier transit, manual document scanning, and tedious keypunching by TPA back-office teams lead to agonizing settlement delays.
2. **Alarmingly High Technical Rejection Rates (>18%):**
   - Nearly 1 in 5 claims face queries or outright rejection due to preventable non-clinical defects:
     - Missing mandatory bills, advance receipts, or itemized breakdowns.
     - Accidental mixing of family member documents (e.g., father's lab report mixed into child's claim).
     - Illegible cursive doctor signatures or diagnostic notes.
     - Incomplete or incorrectly filled IRDAI Part A / Part B forms.
3. **Surprise Out-of-Pocket Deductions:**
   - Hospital bills often bundle hundreds of non-payable medical consumables (gloves, syringes, sanitizers, administrative fees) without itemized segregation.
   - Patients have zero upfront visibility into what will be paid vs. deducted under IRDAI guidelines, causing severe post-settlement disputes.
4. **Complex Policy Capping & Clause Ambiguity:**
   - Policies contain intricate rules: **Sum Insured**, **Room Rent Limits** (e.g. 1% of SI per day), **Co-Payment Clauses** (10–20% senior citizen co-pay), **Pre-Existing Disease (PED) Waiting Periods** (24–48 months), and procedure sub-limits (cataract, maternity).
   - Manually calculating proportionate deductions across room rent and medical expenses is complex and prone to human error.

---

## 3. How ClaimsGuru Solves It: The End-to-End Autonomous Pipeline

ClaimsGuru replaces manual adjudication with a multi-stage, event-driven intelligent pipeline:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLAIMSGURU PIPELINE                                  │
├─────────────────┬──────────────────────┬────────────────────────┬──────────────────────┤
│ 1. INTAKE       │ 2. IDENTITY GATE     │ 3. VISION & OCR        │ 4. CLINICAL NER &    │
│ PDF, JPG, PNG   │ Cross-document       │ Azure Document Intel   │    ICD-10 CODING     │
│ Camera photos   │ consensus algorithm  │ + Table Heuristics     │ Bio-medical LLM & CPT│
├─────────────────┼──────────────────────┼────────────────────────┼──────────────────────┤
│ 5. POLICY TERMS │ 6. CLAUSE AUDIT &    │ 7. 11-RULE IRDAI CHECK │ 8. DOSSIER &         │
│ SI, Room Rent,  │    PROPORTIONAL CUTS │    & RISK SCORING      │    IRDAI ACROFORM    │
│ Co-Pay, PED     │ Bills vs Policy Plan │ Rejection Prediction   │ Fillable PDF + Sign  │
└─────────────────┴──────────────────────┴────────────────────────┴──────────────────────┘
```

### Stage 1: Multi-Format Document Ingestion & Fingerprinting
- Ingests single/multi-page PDFs, JPEG, PNG, TIFF, and camera photos up to 25 MB.
- Generates a set-based **SHA-256 fingerprint** of all uploaded files to instantly detect and prevent accidental duplicate submissions.
- Automatically categorizes files into standardized document types:
  - *Final Hospital Itemized Bill*
  - *Discharge Summary*
  - *Policy Schedule / Insurance Health Card*
  - *Pharmacy Bills & Prescriptions*
  - *Diagnostic & Lab Reports*
  - *Payment Receipts & Advance Vouchers*
  - *KYC (Aadhaar / PAN)*

### Stage 2: Fail-Fast Identity Consensus Gate
- Runs cross-document consensus algorithms matching patient name, gender, age, and relationship across all files.
- Strips hospital names, doctor names, and trailing title noise (e.g. "Rekha Mishra Report" &rarr; "Rekha Mishra").
- If a mismatched document from a different individual is detected, the claim is flagged with `IDENTITY_MISMATCH`, preventing submission and alerting the user immediately.

### Stage 3: Deep Vision OCR & Table Extraction
- Employs **Azure AI Document Intelligence (Form Recognizer)** combined with local computer vision heuristics.
- High-precision table structure reconstruction: accurately captures line items, unit tariffs, quantities, taxes, and departmental sub-totals across hundreds of rows.
- Detects presence of radiology/medical imaging (CT, MRI, X-Ray, Ultrasound).

### Stage 4: Autonomous Clinical NER & ICD-10/CPT Coding
- Proprietary Biomedical Named Entity Recognition (NER) extracts primary diagnosis, secondary comorbidities, and surgical procedures from handwritten/printed discharge notes.
- Uses **FAISS Vector Search** and **Azure OpenAI GPT-4o** to map clinical narratives to official **ICD-10-CM** (diagnoses) and **CPT** (procedures) codes without hardcoded synonyms.

### Stage 5: Policy Schedule & Plan Intelligence Engine
- Ingests the patient's insurance policy schedule and extracts:
  - **Sum Insured (SI):** Total policy financial coverage (e.g., ₹10,00,000).
  - **Room Rent Limit / Capping:** Daily allowable room charge (e.g., 1% of SI = ₹10,000/day, or actual).
  - **Co-Payment Clause:** Mandatory patient cost-sharing (e.g., 10% senior citizen or 20% non-network).
  - **PED Waiting Period:** Disease-specific waiting restrictions (e.g., 24, 36, or 48 months).
  - **Procedure Sub-Limits:** Caps for specific treatments (e.g., Cataract ₹40,000, Maternity ₹50,000).

### Stage 6: Policy vs. Claim Cross-Audit & Proportional Deductions
- Compares actual hospital line items against policy plan caps:
  - Evaluates whether the patient stayed in a higher room category than entitled (calculating proportional deduction on associated medical tariffs).
  - Identifies non-payable consumables (gloves, masks, administrative charges) under IRDAI Schedule I–IV.
  - Computes net approved payable amount vs. gross billed amount upfront.

### Stage 7: 11-Rule IRDAI Adjudication & AI Risk Scoring
- Evaluates the claim against **11 standard IRDAI adjudication rules** (e.g., 10/11 or 11/11 Passed).
- Dual gradient boosting model (XGBoost + LightGBM) computes an **Approval Probability & Risk Score %** (e.g., 12% Low Risk).
- Highlights specific risk drivers (e.g. *"Multiple diagnoses present"*, *"Room rent exceeds 1% of SI"*, *"Active PED waiting period"*).

### Stage 8: Interactive Claim Report, AcroForm & Dossier Generation
- Renders an interactive clinical report modal with document preview tabs, confidence ratings per field, and live editability.
- Auto-populates standardized **IRDAI Claim Form (Part A & Part B)** with real, fillable AcroForm widgets.
- Features an in-browser digital signature pad for touchscreen/stylus signing.
- Generates a certified, audit-ready PDF dossier ready for immediate insurer/TPA adjudication.

### Stage 9: Incremental Policy Upload ("Update Policy Doc" Workflow)
- If a patient files their claim without their policy schedule, the system accepts medical bills, stages them, and displays an **"Update Policy Doc"** action.
- Uploading the policy later dynamically re-evaluates policy clauses and updates SI/room rent limits without re-running or breaking existing hospital bill data.

### Stage 10: TPA & Adjuster Portal (`/[orgSlug]/review`)
- Dedicated review consoles for TPAs (Star Health, ICICI Lombard, HDFC ERGO, Care, etc.).
- Adjusters can approve, reject, or trigger the **Missing Document Workflow (`DOCUMENTS_REQUESTED`)**, specifying exactly which additional bills or clinical reports are required.

---

## 4. Multilingual Accessibility: 14 Indian Languages & RTL

To empower policyholders across all Indian states and vernacular regions, ClaimsGuru provides complete native localization across **14 constitutionally recognized languages** without reliance on external machine translation:

| Capability | Enterprise Technical Implementation & Regional Coverage |
| :--- | :--- |
| **14 Native Languages** | Complete UI coverage: English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, and Sanskrit natively rendered in true regional scripts. |
| **Urdu RTL Support** | Automatic bi-directional text flow and layout switching (`dir="rtl"`) for seamless Urdu reading and form completion. |
| **Persistent Preference** | User language selection is preserved across sessions in `localStorage` (`claimsguru_lang`) and synchronized to the HTML root element (`<html lang="...">`). |
| **WCAG AA Accessibility** | High-contrast compliance (contrast ratio &ge; 4.5:1) across all script systems with 44&times;44px touch targets on mobile and desktop. |

---

## 5. Technology Stack & Cloud Infrastructure

### Frontend Architecture
- **Framework:** Next.js 14 (App Router) + React 18 / 19
- **Styling & Components:** Tailwind CSS, Lucide React, Framer Motion-inspired CSS animations
- **Design System:** WCAG AA compliant (all text &ge; 4.5:1 contrast, 44&times;44px touch targets)
- **Responsive Layout:** Optimized from 375px mobile screens up to 1366&times;768 laptops and 4K displays
- **Auth Client:** MSAL / Microsoft Entra External ID integration

### Backend Microservices
- **API Runtime:** Python 3.11+ running in Debian Bookworm slim container images
- **Web Framework:** **FastAPI (v0.128.8)** with **Uvicorn (v0.39.0)** and **uvloop**
- **Data Validation:** Pydantic v2.12.5 with strict type schemas
- **Task Queue:** **Celery (v5.4.0)** with dedicated worker pools (`ocr_queue`, `parser_queue`, `default_queue`)
- **Message Broker:** **Azure Cache for Redis** (in-memory state sync and sub-millisecond caching)
- **Event Bus:** **Azure Service Bus** (guaranteed at-least-once message delivery between ingress and workers)

### Cloud, Storage & Database (Microsoft Azure Pre-Prod)
- **Container Platform:** **Azure Container Apps (ACA)** in Central India with automated horizontal scaling
- **Relational Database:** **Azure SQL Database (MS SQL Server)** with ACID transactional integrity and SQLAlchemy 2.0 connection pooling
- **Document Lake:** **Azure Blob Storage (Hot Tier)** with AES-256 server-side encryption
- **Secret Management:** **Azure Key Vault** (hardware-backed HSM encryption for keys and connection strings)
- **Notifications:** **Azure Communication Services (ACS Email)** for transactional claim status updates

### AI, Machine Learning & OCR
- **Generative AI / LLM:** **Azure OpenAI GPT-4o** (private endpoint, 2024-11-20 API)
- **Document OCR:** **Azure AI Document Intelligence (Form Recognizer v3.3.0)**
- **Vector Search:** **FAISS (`faiss-cpu`)** + BM25 for ICD-10 medical code ranking
- **Predictive ML:** **XGBoost** and **LightGBM** classification models
- **PDF Engine:** PyMuPDF (`fitz`), `pdfplumber`, and `weasyprint` for AcroForm and PDF dossier rendering

---

## 6. Security, Privacy & Compliance (Zero Egress Private AI)

1. **Zero Public AI Egress:** All AI inferences execute strictly within private Azure customer boundaries. No patient health records (PHI/PII) are ever sent to public commercial models or used for model training.
2. **Digital Personal Data Protection (DPDP) Act, 2023 (India):** Complete compliance with user consent, data minimization, and permanent one-click data erasure.
3. **IRDAI Compliance:** Standardizes deductions under official non-payable schedules (Schedule I–IV) and populates official IRDAI claim formats.
4. **HIPAA & ISO 27001 Alignment:** AES-256 bit encryption at rest, TLS 1.3 in transit, and immutable audit logging in `dbo.audit_logs`.
5. **Identity & RBAC:** Protected by **Microsoft Entra External ID (CIAM)** with RS256 JWT validation and multi-factor authentication (MFA).

---

## 7. Key Domain Terminology for New Joiners

| Term | Full Meaning & Context in ClaimsGuru |
| :--- | :--- |
| **TPA** | **Third-Party Administrator**: Licensed entity processing health insurance claims on behalf of insurance companies (e.g. Medi Assist, Paramount, Vipul Medcorp). |
| **IRDAI** | **Insurance Regulatory and Development Authority of India**: The national statutory regulatory body governing all insurance rules, formats, and non-payable deductions. |
| **Sum Insured (SI)** | The maximum financial ceiling the insurer will pay for all hospitalizations within a policy year. |
| **Room Rent Capping** | Clause restricting daily hospital room rent (often 1% of Sum Insured). Staying in a costlier room triggers proportional cuts on all surgery and doctor fees. |
| **Co-Payment** | A mandatory percentage (e.g. 10% or 20%) of the approved claim that the policyholder must pay from their own pocket. |
| **PED** | **Pre-Existing Disease**: A medical condition diagnosed before policy inception. Usually subject to a 24- to 48-month waiting period before claims are payable. |
| **AcroForm** | Standardized interactive form fields embedded within PDF documents that allow digital population and electronic signing. |
| **ICD-10-CM** | **International Classification of Diseases, 10th Revision**: Universal medical classification codes used globally for clinical diagnoses. |
| **CPT** | **Current Procedural Terminology**: Standardized 5-digit medical codes assigned to surgeries, diagnostic tests, and treatments. |
| **Cashless vs Reimbursement** | Cashless is settled directly between hospital and insurer; Reimbursement is paid by the patient upfront and claimed back later via ClaimsGuru. |

---

*Document compiled by WaferWire Cloud Technologies (WCT) — ClaimsGuru Engineering & Product Team.*

