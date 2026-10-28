# ClaimsGuru Internal Testing Guide: Patient Reimbursement Portal
**Document Version:** 1.0  
**Target Audience:** WaferWire Internal Employees & Beta Testers  
**Scope:** Patient Portal Registration, Document Intake, AI OCR Extraction & Dossier Verification  
**Access URL:** [https://www.wct-health.com/login](https://www.wct-health.com/login)

---

## 1. Welcome to ClaimsGuru: The Product & The Mission

### What is ClaimsGuru?
**ClaimsGuru by WaferWire Cloud Technologies** is a next-generation healthcare claims intelligence platform designed to eliminate the friction, delays, and complexity of health insurance reimbursement.

### The Problem We Are Solving
Filing for health insurance reimbursement in India has traditionally been a painful, frustrating experience:
* **The Paperwork Nightmare:** Patients must manually scan, organize, and submit 20–50 pages of physical documents (discharge summaries, itemized hospital bills, payment receipts, pharmacy slips, and lab investigations).
* **High Rejection & Query Rates:** Over 30% of reimbursement claims face prolonged delays or deduction queries because of illegible bills, missing doctor prescriptions, or non-compliance with standard IRDAI dossier requirements.
* **Lengthy Turnaround Times:** Manual data entry by TPAs takes 2 to 4 weeks before a claim is even reviewed.

### The ClaimsGuru Solution
* **Instant Digital Intake:** Patients upload their hospital documents (PDFs or mobile photos) in one place.
* **AI-Assisted Line-Item Extraction:** Our multimodal AI reads complex, multi-page hospital bills in under 3 minutes, automatically itemizing room rent, doctor consultations, ICU charges, medicines, and consumables.
* **Pre-Submission IRDAI Dossier Verification:** ClaimsGuru checks the claim against standard regulatory and TPA checklists in real-time, warning the patient of missing bills or documentation *before* submission.

---

## 2. Why We Need Your Help (The Goal of this Internal Testing)

In real-world healthcare, hospital bills come in hundreds of different formats:
* Computer-generated ERP invoices (e.g., Apollo, Fortis, Manipal).
* Dot-matrix and thermal receipts from local nursing homes.
* Handwritten doctor notes and pharmacy counters.

To ensure our AI engine works reliably for anyone across India, **we need real-world documents**. 

We invite you to test ClaimsGuru by using **actual hospital bills, discharge summaries, and receipts from any past medical treatments or insurance reimbursement claims you have experienced**. 

Testing with real-world documents will help us benchmark:
1. **Extraction Accuracy:** Does the AI correctly extract the hospital name, dates, diagnosis, bill numbers, and line items?
2. **Speed & Efficiency:** How fast does the document parsing and validation complete?
3. **Usability & Flow:** Is the mobile and web interface effortless for a patient to navigate?

---

## 3. Strict Data Privacy & Security Guarantee

We take your medical privacy with the utmost seriousness:
* **Zero External PHI Egress:** All data and documents remain strictly within our private, dedicated Microsoft Azure Cloud tenant. Nothing is sent to public AI platforms.
* **Enterprise Encryption:** All uploaded medical files are encrypted both in transit (TLS 1.3) and at rest (AES-256).
* **IRDAI & ISO 27001 Aligned:** Our data handling strictly follows healthcare regulatory standards.
* **Complete Deletion Control:** You have full ownership of your test data. Once your testing is done, you can permanently delete your account and all associated documents anytime directly from the platform.

---

## 4. Step-by-Step Testing Walkthrough

### Step 1: Access & Sign Up / Sign In
1. Open the portal: **[https://www.wct-health.com/login](https://www.wct-health.com/login)** on your mobile browser or laptop.
2. Select **"Continue as Patient"**.
3. If it is your first time, click **"Create an account"** at the bottom to register using your email and Microsoft Entra External ID.
4. Complete the secure OTP verification.

> **[INSERT SCREENSHOT HERE: Patient Sign In & Portal Selection Screen]**

---

### Step 2: Start a New Reimbursement Claim
1. Once logged into your Patient Dashboard, click on **"Start New Claim"** or **"Submit Reimbursement Claim"**.
2. Provide basic claim context (e.g., Patient Name, Hospital Name, Date of Admission/Discharge).

> **[INSERT SCREENSHOT HERE: Patient Dashboard & New Claim Button]**

---

### Step 3: Upload Medical Documents
1. Upload your documents by category or as a single dossier:
   * **Discharge Summary** (Hospital discharge card, treatment summary)
   * **Final Detailed Hospital Bill** (Itemized invoice with room rent, doctor fees, etc.)
   * **Payment Receipts** (Receipts proving amount paid)
   * **Pharmacy Bills & Prescriptions** (Medicine bills with doctor's prescription)
   * **Diagnostic & Lab Reports** (Blood tests, radiology reports, etc.)
2. You can upload clear smartphone photos (JPG/PNG) or PDFs.
3. Click **"Process & Extract"**.

> **[INSERT SCREENSHOT HERE: Document Upload Section with Multi-File Upload]**

---

### Step 4: Review AI Extraction & Line-Item Breakdown
1. Watch the real-time AI extraction pipeline process your documents.
2. Review the extracted data:
   * **Hospital & Admission Details:** Hospital Name, Admission Date, Discharge Date.
   * **Diagnosis & Clinical Findings:** Ailment/reason for hospitalization.
   * **Line-Item Financial Summary:** Room rent, doctor charges, medicines, diagnostics.
3. **Self-Check:** Compare the extracted figures against your actual physical bill. Does the total match? Are any line items misclassified?

> **[INSERT SCREENSHOT HERE: Extracted Bill Items & Financial Summary View]**

---

### Step 5: IRDAI Dossier Checklist & Final Submission
1. Look at the **Pre-Submission Compliance Checklist**:
   * Does it show whether all mandatory documents are present?
   * If a document is missing (e.g., missing doctor prescription for a pharmacy bill), notice how the system flags it.
2. Complete the final review and click **"Submit Claim"**.

> **[INSERT SCREENSHOT HERE: Pre-Submission Checklist & Final Submit Screen]**

---

## 5. What to Pay Attention To (Evaluation Criteria)

While going through the flow, please note down:

| Area | What to Look For |
| :--- | :--- |
| **OCR & Data Accuracy** | Did the system read the exact rupee amounts, bill numbers, dates, and hospital names accurately? |
| **Handwritten / Difficult Text** | Did it manage to parse handwritten doctor notes or stamped pharmacy slips? |
| **System Speed** | Did the file upload and AI extraction finish within 2 to 3 minutes without hanging? |
| **Mobile Responsiveness** | Did the interface fit nicely on your phone screen without overflowing or tiny unreadable text? |
| **Clarity of Instructions** | Was any step confusing, or did you feel unsure about what to upload next? |

---

## 6. How to Report Bugs & Feedback

Your honest feedback—both positive and critical—is what will make ClaimsGuru world-class.

Please submit your feedback via:
* **Feedback Form:** [Insert Microsoft Forms / Google Form Link]
* **Internal Slack/Teams Channel:** `#claimsguru-beta-testing`
* **Email:** `support@waferwire.com` (or project lead email)

### Bug Report Format:
To help our engineering team reproduce and fix issues quickly, please share:
1. **Device & Browser:** (e.g., *iPhone 16 Safari*, *Samsung Galaxy Chrome*, *Windows 11 Edge*)
2. **Step Where Issue Occurred:** (e.g., *During bill upload on Step 3*)
3. **Expected vs. Actual Result:** (e.g., *Expected total to be ₹45,200, but AI extracted ₹40,000*)
4. **Screenshot or Screen Recording:** (Attach whenever possible)

---

**Thank you for your valuable support in testing and refining ClaimsGuru!**  
*WaferWire Cloud Technologies — Healthcare Engineering Team*
