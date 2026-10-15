"""
ClaimsGuru Privacy Policy Module
Product of WaferWire LLC

Provides both standard non-editable HTML webpage and structured JSON API
compliant with Google Play Developer User Data Policy, HIPAA, and Indian DPDP Act.
"""

from typing import Any, Dict

LAST_UPDATED = "October 15, 2026"
EFFECTIVE_DATE = "October 15, 2026"
VERSION = "1.2.0"

COMPANY_DETAILS: Dict[str, str] = {
    "name": "WaferWire LLC",
    "product": "ClaimsGuru",
    "address": "4034 148TH Ave NE, Redmond - 98052-5165, United States (US)",
    "email": "info@waferwire.com",
    "phone": "+14252460195",
    "website": "https://waferwire.com/",
}

PRIVACY_POLICY_DATA: Dict[str, Any] = {
    "title": "ClaimsGuru Privacy Policy",
    "product_name": "ClaimsGuru",
    "owner": COMPANY_DETAILS,
    "last_updated": LAST_UPDATED,
    "effective_date": EFFECTIVE_DATE,
    "version": VERSION,
    "summary": (
        "ClaimsGuru, a product of WaferWire LLC, is committed to safeguarding your personal "
        "and sensitive medical data. This Privacy Policy details how we collect, process, store, "
        "share, retain, and protect your information when using the ClaimsGuru mobile application, "
        "web portals, and backend processing APIs."
    ),
    "sections": [
        {
            "id": "introduction",
            "title": "1. Introduction & Overview",
            "content": (
                "ClaimsGuru ('we', 'us', 'our') is a proprietary medical insurance claims automation "
                "platform developed and operated by WaferWire LLC, located at 4034 148TH Ave NE, Redmond - "
                "98052-5165, United States (US). This Privacy Policy applies to all users of the ClaimsGuru "
                "mobile application, patient/claimant portals, and associated services. By accessing or using "
                "ClaimsGuru, you acknowledge and agree to the data collection, processing, and storage practices "
                "described herein."
            ),
        },
        {
            "id": "information-collected",
            "title": "2. Information & Documents Users Upload",
            "content": (
                "To provide AI-assisted medical claims compilation, validation, and submission, ClaimsGuru "
                "collects the following categories of data:"
            ),
            "subsections": [
                {
                    "title": "A. Personal Identifiable Information (PII)",
                    "items": [
                        "Full legal name, date of birth, gender, and marital status",
                        "Contact details: email address, telephone/mobile number, and physical residential address",
                        "Relationship to the primary policyholder (self, spouse, child, parent, dependent)",
                    ],
                },
                {
                    "title": "B. Government & KYC Identification Documents",
                    "items": [
                        "Government-issued identity cards (e.g., Aadhaar card, PAN card, Voter ID, Driver's License, or Passport)",
                        "Member ID card, insurance health card, or corporate employee identification badge",
                        "Documents uploaded under the Identity Gate are hashed and verified to prevent identity fraud and ensure authentic claim submission",
                    ],
                },
                {
                    "title": "C. Health, Medical & Clinical Records",
                    "items": [
                        "Hospital discharge summaries, admission and discharge notes, and hospital case sheets",
                        "Itemized final hospital bills, interim invoices, breakdown of pharmacy charges, and payment receipts",
                        "Doctor and specialist consultation prescriptions, orders, and treatment records",
                        "Diagnostic investigation reports, pathology and radiology results (e.g., Blood tests, ECG, CT scan, MRI, X-rays)",
                        "Implant invoices, surgical notes, anaesthesia records, and emergency admission documentation",
                        "International Classification of Diseases (ICD-10) diagnosis codes and Current Procedural Terminology (CPT) procedural codes",
                    ],
                },
                {
                    "title": "D. Insurance Policy & Financial Information",
                    "items": [
                        "Insurance company name, policy number, certificate number, and corporate group/employer ID",
                        "Third-Party Administrator (TPA) name, member ID, and pre-authorization reference numbers",
                        "Bank account details (Account number, bank name, branch, IFSC/routing code) used strictly for processing authorized direct claim reimbursement payouts",
                    ],
                },
                {
                    "title": "E. Device, Technical & Usage Information",
                    "items": [
                        "Device model, operating system version, unique device identifiers, and network IP address",
                        "Firebase Cloud Messaging (FCM) push notification tokens to send real-time claim status updates and query alerts",
                        "Application crash logs, system diagnostic data, and security audit logs to maintain platform stability and protect against unauthorized access",
                    ],
                },
            ],
        },
        {
            "id": "how-information-is-processed",
            "title": "3. How Claim Information is Processed & Stored",
            "content": (
                "ClaimsGuru utilizes a high-security, multi-stage pipeline to digitize, analyze, and package "
                "medical insurance claims:"
            ),
            "subsections": [
                {
                    "title": "A. Ingestion & Cryptographic Verification",
                    "items": [
                        "Upon upload, every file receives a cryptographic SHA-256 content hash to ensure data integrity and prevent post-upload tampering.",
                        "All uploads are transmitted exclusively over encrypted TLS 1.3 / HTTPS connections.",
                    ],
                },
                {
                    "title": "B. Optical Character Recognition (OCR) & AI Extraction",
                    "items": [
                        "Proprietary OCR and Azure AI Document Intelligence extract printed and handwriting text from medical bills, receipts, and clinical documents.",
                        "Natural Language Processing (NLP) models identify line items, billing amounts, diagnoses, physician notes, and dates of service.",
                    ],
                },
                {
                    "title": "C. Medical Coding & Rule Validation",
                    "items": [
                        "Clinical data is mapped to standardized medical codes (ICD-10, CPT) for regulatory and insurer compatibility.",
                        "Automated validation checks verify policy limits, room-rent capping, co-pay clauses, deductibles, and required regulatory claim forms (e.g., IRDAI Part A & Part B).",
                    ],
                },
                {
                    "title": "D. Cloud Infrastructure & At-Rest Encryption",
                    "items": [
                        "Files and documents are stored in enterprise-grade Microsoft Azure Blob Storage / secure cloud object stores, encrypted at rest using AES-256.",
                        "Structured claim metadata is stored in hardened Azure SQL / Microsoft SQL Server databases with row-level security and strict user/tenant isolation.",
                        "No unauthorized employee or third party has unencrypted access to medical records.",
                    ],
                },
            ],
        },
        {
            "id": "data-sharing",
            "title": "4. Data Sharing & Third-Party Disclosure",
            "content": (
                "We do not sell, rent, monetize, or trade your personal information or medical records to "
                "data brokers, advertising networks, or any unaffiliated third parties. Data is shared strictly "
                "as necessary to process and adjudicate your claims:"
            ),
            "subsections": [
                {
                    "title": "A. Insurance Companies & Third-Party Administrators (TPAs)",
                    "items": [
                        "When you request or submit a claim, compiled claim dossiers, medical documents, and billing records are shared with your designated insurer or TPA (e.g., Medi Assist, Vidal Health, Star Health, ICICI Lombard, Care Health, HDFC ERGO, or your selected provider) to adjudicate and settle your claim.",
                    ],
                },
                {
                    "title": "B. Cloud & Technical Service Providers",
                    "items": [
                        "Microsoft Azure: Enterprise cloud hosting, encrypted storage, and AI Document Intelligence under strict Business Associate and data processing agreements.",
                        "Microsoft Entra ID: Secure, standards-based user authentication and identity management.",
                        "Firebase / Google Cloud: Mobile push notification delivery (FCM) strictly for real-time claim status alerts.",
                    ],
                },
                {
                    "title": "C. Legal & Regulatory Compliance",
                    "items": [
                        "We may disclose information if required by subpoena, court order, or applicable healthcare and insurance regulatory authorities (such as IRDAI or state insurance departments).",
                    ],
                },
            ],
        },
        {
            "id": "data-retention-and-deletion",
            "title": "5. Data Retention & How Users Can Request Deletion",
            "content": (
                "We uphold data minimization principles and provide clear mechanisms for account and data deletion:"
            ),
            "subsections": [
                {
                    "title": "A. Data Retention Period",
                    "items": [
                        "Active Claims: Retained for the duration necessary to adjudicate the claim, process reimbursements, and handle insurer queries or appeals.",
                        "Regulatory Compliance: Insurance and medical statutory retention requirements may mandate retaining certain financial and claim transaction logs for the legally prescribed statutory period (typically up to 3–7 years).",
                        "Inactive / Deleted Accounts: Once account deletion is requested, all active user records, personal profiles, and document attachments are purged within 30 days, subject only to mandatory legal dispute holds.",
                    ],
                },
                {
                    "title": "B. How to Request Account & Data Deletion",
                    "items": [
                        "In-App Deletion: Open the ClaimsGuru mobile app, navigate to Profile -> Settings -> tap 'Delete Account', and confirm. Your account, credentials, and associated claims will be immediately queued for permanent erasure.",
                        "Email Request: Send an email to info@waferwire.com with the subject line 'ClaimsGuru Data Deletion Request' from your registered email address. We will verify your identity and confirm permanent deletion within 30 business days.",
                    ],
                },
                {
                    "title": "C. Scope of Deletion",
                    "items": [
                        "Permanent deletion of personal profile data, email, phone number, and patient demographics.",
                        "Permanent deletion of user identity in Microsoft Entra / authentication stores.",
                        "Purging of all uploaded medical records, identity documents, bills, and generated PDF claim forms from cloud storage.",
                    ],
                },
            ],
        },
        {
            "id": "security-measures",
            "title": "6. Data Security & Protection Safeguards",
            "content": (
                "WaferWire LLC implements state-of-the-art administrative, physical, and technical safeguards:"
            ),
            "items": [
                "256-bit AES encryption for all data at rest in database and blob storage systems.",
                "TLS 1.3 / HTTPS encryption for all data in transit across public and internal networks.",
                "Multi-factor authentication (MFA) and Microsoft Entra ID enterprise access controls for all internal operational personnel.",
                "Role-based access controls (RBAC) ensuring that patients only access their own claims and medical records.",
                "Continuous automated vulnerability scanning, rate limiting, and OWASP-compliant security headers.",
            ],
        },
        {
            "id": "children-privacy",
            "title": "7. Children's Privacy",
            "content": (
                "ClaimsGuru is not directed to individuals under the age of 18 without parental or guardian supervision. "
                "When parents or legal guardians file claims on behalf of minor dependents, all data is submitted under "
                "the adult policyholder's verified account, and consent is granted by the legal parent or guardian."
            ),
        },
        {
            "id": "international-users",
            "title": "8. Global Accessibility & Cross-Border Transfers",
            "content": (
                "ClaimsGuru and this Privacy Policy are accessible worldwide without geographical restrictions or geofencing. "
                "Depending on where you access the service, your data may be processed on secure Microsoft Azure cloud servers "
                "located in the United States, India, or other secure regions with equal or greater data protection standards."
            ),
        },
        {
            "id": "policy-updates",
            "title": "9. Changes to This Privacy Policy",
            "content": (
                "WaferWire LLC may periodically update this Privacy Policy to reflect platform enhancements, regulatory changes, "
                "or new features. We will notify you of material changes via an in-app notice, email notification, or by updating "
                "the 'Last Updated' date at the top of this webpage. Continued use of ClaimsGuru following such updates constitutes "
                "acceptance of the revised terms."
            ),
        },
        {
            "id": "contact-us",
            "title": "10. Contact Information & Privacy Questions",
            "content": (
                "If you have questions, concerns, complaints, or wish to exercise your data protection rights, please contact "
                "the WaferWire LLC privacy office:"
            ),
            "contact_details": {
                "company": "WaferWire LLC",
                "product": "ClaimsGuru",
                "address": "4034 148TH Ave NE, Redmond - 98052-5165, United States (US)",
                "email": "info@waferwire.com",
                "phone": "+14252460195",
                "website": "https://waferwire.com/",
                "dpo_contact": "info@waferwire.com (Attn: Data Privacy Officer)",
            },
        },
    ],
}


def get_privacy_policy_html() -> str:
    """Generate a high-performance, non-editable, responsive HTML webpage

    Complies with Google Play Developer User Data Policy:
    - Non-editable webpage
    - Accessible worldwide without login
    - Clean typography, modern aesthetic, mobile-friendly
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - ClaimsGuru | WaferWire LLC</title>
  <meta name="description" content="ClaimsGuru Privacy Policy. Learn how ClaimsGuru by WaferWire LLC collects, uses, processes, stores, and protects your medical claim documents and personal data.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://waferwire.com/privacy-policy">
  <style>
    :root {{
      --primary: #0d9488;
      --primary-dark: #0f766e;
      --primary-light: #ccfbf1;
      --navy: #0f172a;
      --slate-800: #1e293b;
      --slate-600: #475569;
      --slate-400: #94a3b8;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --white: #ffffff;
      --radius: 12px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
      --shadow-md: 0 4px 12px rgba(15,23,42,0.08);
      --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: var(--font-stack);
      color: var(--slate-800);
      background-color: var(--slate-50);
      line-height: 1.7;
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
    }}
    header {{
      background: linear-gradient(135deg, var(--navy) 0%, #134e4a 100%);
      color: var(--white);
      padding: 48px 24px;
      text-align: center;
      border-bottom: 4px solid var(--primary);
    }}
    .header-badge {{
      display: inline-block;
      background: rgba(13, 148, 136, 0.25);
      border: 1px solid rgba(45, 212, 191, 0.4);
      color: #5eead4;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 16px;
      text-transform: uppercase;
    }}
    header h1 {{
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }}
    header p.subtitle {{
      font-size: 18px;
      color: #cbd5e1;
      max-width: 720px;
      margin: 0 auto 16px auto;
    }}
    .meta-bar {{
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      font-size: 14px;
      color: #94a3b8;
    }}
    .meta-bar span strong {{
      color: #f1f5f9;
    }}
    .container {{
      max-width: 960px;
      margin: 40px auto;
      padding: 0 24px;
    }}
    .notice-card {{
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-left: 5px solid var(--primary);
      padding: 24px;
      border-radius: var(--radius);
      margin-bottom: 32px;
      box-shadow: var(--shadow-sm);
    }}
    .notice-card p {{
      color: var(--slate-600);
      font-size: 15px;
      margin: 0;
    }}
    .content-card {{
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius);
      padding: 40px;
      box-shadow: var(--shadow-md);
      margin-bottom: 40px;
    }}
    section {{
      margin-bottom: 40px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--slate-200);
    }}
    section:last-child {{
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }}
    h2 {{
      color: var(--navy);
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    h3 {{
      color: var(--slate-800);
      font-size: 17px;
      font-weight: 600;
      margin: 20px 0 10px 0;
    }}
    p {{
      color: var(--slate-600);
      margin-bottom: 16px;
    }}
    ul {{
      margin: 12px 0 20px 24px;
      color: var(--slate-600);
    }}
    li {{
      margin-bottom: 8px;
    }}
    .info-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: var(--slate-50);
      border-radius: 8px;
      overflow: hidden;
    }}
    .info-table th, .info-table td {{
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--slate-200);
      font-size: 14px;
    }}
    .info-table th {{
      background: var(--slate-100);
      color: var(--navy);
      font-weight: 600;
    }}
    .info-table td:first-child {{
      font-weight: 600;
      color: var(--slate-800);
      width: 25%;
    }}
    .highlight-box {{
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      padding: 18px 20px;
      margin: 16px 0;
    }}
    .highlight-box strong {{
      color: var(--primary-dark);
      display: block;
      margin-bottom: 6px;
    }}
    .highlight-box p {{
      margin: 0;
      color: #115e59;
      font-size: 14px;
    }}
    .contact-card {{
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      padding: 24px;
      margin-top: 16px;
    }}
    .contact-item {{
      display: flex;
      margin-bottom: 10px;
      font-size: 15px;
    }}
    .contact-label {{
      font-weight: 600;
      color: var(--slate-800);
      width: 140px;
      flex-shrink: 0;
    }}
    .contact-val a {{
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 500;
    }}
    .contact-val a:hover {{
      text-decoration: underline;
    }}
    footer {{
      background-color: var(--navy);
      color: var(--slate-400);
      text-align: center;
      padding: 32px 24px;
      font-size: 14px;
      margin-top: 60px;
    }}
    footer a {{
      color: #5eead4;
      text-decoration: none;
    }}
    footer a:hover {{
      text-decoration: underline;
    }}
    @media (max-width: 640px) {{
      header h1 {{ font-size: 28px; }}
      .content-card {{ padding: 24px 16px; }}
      .contact-item {{ flex-direction: column; }}
      .contact-label {{ margin-bottom: 4px; }}
      .info-table td:first-child {{ width: 35%; }}
    }}
    @media print {{
      body {{ background: #fff; font-size: 12pt; }}
      header, footer {{ background: none; color: #000; border: none; }}
      .content-card, .notice-card {{ box-shadow: none; border: 1px solid #ccc; }}
    }}
  </style>
</head>
<body>

  <header>
    <div class="header-badge">Official Policy Documentation</div>
    <h1>ClaimsGuru Privacy Policy</h1>
    <p class="subtitle">How ClaimsGuru collects, protects, processes, and manages medical claim information and user data.</p>
    <div class="meta-bar">
      <span><strong>Product:</strong> ClaimsGuru</span>
      <span><strong>Provider:</strong> WaferWire LLC</span>
      <span><strong>Effective Date:</strong> {EFFECTIVE_DATE}</span>
      <span><strong>Version:</strong> {VERSION}</span>
    </div>
  </header>

  <main class="container">
    <div class="notice-card">
      <p>
        <strong>Transparency & Trust Notice:</strong> This privacy policy applies directly to the 
        <strong>ClaimsGuru</strong> mobile application, web portal, and backend services provided by 
        <strong>WaferWire LLC</strong>. ClaimsGuru complies with the Google Play Developer User Data Policy, 
        HIPAA security standards, and applicable privacy regulations. It is publicly accessible worldwide 
        without geographical restrictions or login requirements.
      </p>
    </div>

    <div class="content-card">
      <!-- Section 1 -->
      <section id="introduction">
        <h2>1. Introduction & Overview</h2>
        <p>
          ClaimsGuru ("we", "us", "our") is an intelligent medical claims automation platform created 
          and owned by <strong>WaferWire LLC</strong>, headquartered at 4034 148TH Ave NE, Redmond - 98052-5165, 
          United States (US).
        </p>
        <p>
          ClaimsGuru is designed to assist patients, insured individuals, corporate employees, healthcare providers, 
          and Third-Party Administrators (TPAs) by digitizing, parsing, validating, and submitting health insurance 
          reimbursement and cashless claims. Because our application handles sensitive medical and personal data, 
          we maintain the highest standards of data confidentiality, encryption, and regulatory compliance.
        </p>
      </section>

      <!-- Section 2 -->
      <section id="information-collected">
        <h2>2. What Personal Information & Medical Documents Users Upload</h2>
        <p>
          To process, adjudicate, and validate your medical insurance claims, ClaimsGuru collects the following 
          categories of information when you register an account, upload documents, or submit a claim:
        </p>

        <h3>A. Personal Identifiable Information (PII)</h3>
        <ul>
          <li><strong>Identity Details:</strong> Full legal name, date of birth, age, gender, marital status, and relationship to primary policyholder.</li>
          <li><strong>Contact Information:</strong> Email address, mobile telephone number, and physical residential address.</li>
          <li><strong>Account Credentials:</strong> Secure authentication tokens managed via Microsoft Entra ID with encrypted password hashes.</li>
        </ul>

        <h3>B. Government & Identity Verification (KYC) Documents</h3>
        <ul>
          <li><strong>Government IDs:</strong> Aadhaar card, PAN card, Voter ID, Driver's License, or Passport uploaded under the Identity Gate to verify claimant identity and prevent fraudulent claim filings.</li>
          <li><strong>Insurance Identifiers:</strong> Health insurance e-card, member ID card, TPA card, and corporate employee ID.</li>
        </ul>

        <h3>C. Medical, Clinical & Hospital Records</h3>
        <ul>
          <li><strong>Hospital Discharge Summaries:</strong> Hospital admission and discharge dates, discharge status, clinical summary, and attending doctor notes.</li>
          <li><strong>Medical Bills & Receipts:</strong> Final itemized hospital bills, interim invoices, pharmacy receipts, surgical equipment vouchers, and payment proofs.</li>
          <li><strong>Doctor Prescriptions:</strong> Physician consultation notes, outpatient prescriptions, and recommended treatment plans.</li>
          <li><strong>Diagnostic & Investigation Reports:</strong> Pathology lab reports, radiology reports (e.g., Blood tests, ECG, X-Ray, Ultrasound, CT Scan, MRI), and biopsy records.</li>
          <li><strong>Clinical Codes:</strong> Standardized ICD-10 diagnosis codes and CPT procedural codes extracted from medical records.</li>
        </ul>

        <h3>D. Insurance Policy & Financial Information</h3>
        <ul>
          <li><strong>Insurance Policy Data:</strong> Insurance provider name, policy number, certificate number, corporate group ID, coverage limits, and deductible details.</li>
          <li><strong>Payout Banking Details:</strong> Bank name, account number, branch, and IFSC/routing code necessary for direct electronic reimbursement settlement by the insurer or TPA.</li>
        </ul>

        <h3>E. Technical & Device Information</h3>
        <ul>
          <li><strong>Device & Network Data:</strong> Device model, operating system version, unique device identifier, IP address, and network provider.</li>
          <li><strong>Push Notifications (FCM):</strong> Firebase Cloud Messaging device tokens used exclusively to notify you of claim status transitions, missing document requests, and settlement updates.</li>
        </ul>
      </section>

      <!-- Section 3 -->
      <section id="processing-storage">
        <h2>3. How Claim Information is Processed & Stored</h2>
        <p>
          ClaimsGuru employs robust cloud architecture, artificial intelligence, and strict security protocols 
          to process and protect your claim documents:
        </p>

        <div class="highlight-box">
          <strong>Cryptographic Document Ingestion (SHA-256)</strong>
          <p>
            Upon file upload, ClaimsGuru computes an immutable SHA-256 hash for every document. 
            This cryptographic fingerprint ensures that uploaded medical bills and records cannot be altered, 
            tampered with, or substituted throughout the processing lifecycle.
          </p>
        </div>

        <table class="info-table">
          <thead>
            <tr>
              <th>Processing Stage</th>
              <th>Technical Method</th>
              <th>Security & Privacy Safeguard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ingestion & Upload</td>
              <td>TLS 1.3 / HTTPS Encrypted Uploads</td>
              <td>All transfers enforce high-cipher SSL. Public file access is strictly blocked.</td>
            </tr>
            <tr>
              <td>OCR & Extraction</td>
              <td>Azure AI Document Intelligence & OCR</td>
              <td>Text extraction runs in secure, zero-data-retention isolated processing pipelines.</td>
            </tr>
            <tr>
              <td>Medical NLP & Coding</td>
              <td>AI Clinical Rule Engine</td>
              <td>Extracts ICD-10 and CPT codes, parses IRDAI Part A & B forms, validates against policy limits.</td>
            </tr>
            <tr>
              <td>Document Storage</td>
              <td>Microsoft Azure Blob Storage</td>
              <td>Stored in encrypted containers with AES-256 encryption at rest.</td>
            </tr>
            <tr>
              <td>Metadata & Claims DB</td>
              <td>Azure SQL / Microsoft SQL Server</td>
              <td>Row-level security, tenant isolation, parameterised queries, and automated daily backups.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Section 4 -->
      <section id="sharing">
        <h2>4. Data Sharing & Third-Party Disclosures</h2>
        <p>
          <strong>We never sell, rent, monetize, or trade your personal data or health information to advertisers, 
          marketing agencies, or data brokers.</strong>
        </p>
        <p>Your data is shared strictly in the following limited circumstances:</p>
        <ul>
          <li>
            <strong>Designated Insurance Providers & TPAs:</strong> When you initiate a claim submission, your claim 
            package (including discharge summary, itemized bills, diagnosis details, and completed IRDAI forms) is 
            transmitted directly to the selected insurance carrier or licensed Third-Party Administrator 
            (e.g., Medi Assist, Vidal Health, Star Health, ICICI Lombard, Care Health, HDFC ERGO) to evaluate, adjudicate, 
            and pay your insurance claim.
          </li>
          <li>
            <strong>Cloud Infrastructure Partners:</strong> We partner with Microsoft Azure for secure cloud hosting, 
            database infrastructure, and OCR services under enterprise enterprise Data Protection Agreements (DPAs). 
            Authentication is powered by Microsoft Entra ID.
          </li>
          <li>
            <strong>Mobile Push Services:</strong> Google Firebase Cloud Messaging (FCM) is utilized solely for 
            dispatching real-time notifications regarding claim approval, query status, or required additional documents.
          </li>
          <li>
            <strong>Legal & Regulatory Authorities:</strong> We may disclose data when legally required by court order, 
            subpoena, law enforcement warrant, or applicable insurance regulatory bodies (such as IRDAI).
          </li>
        </ul>
      </section>

      <!-- Section 5 -->
      <section id="retention-deletion">
        <h2>5. Data Retention & How Users Can Request Deletion</h2>
        
        <h3>A. Retention Period</h3>
        <p>
          We retain your personal information, claims data, and medical files only as long as necessary to 
          fulfill the purposes outlined in this policy:
        </p>
        <ul>
          <li><strong>Active Claims:</strong> Retained while your claim is active, under review, in adjudication, or subject to reimbursement queries.</li>
          <li><strong>Regulatory & Statutory Compliance:</strong> Medical record and insurance regulations generally mandate maintaining claim records and financial logs for statutory periods (typically 3 to 7 years) to support regulatory audits, fraud prevention, and dispute resolution.</li>
          <li><strong>Account Deletion:</strong> When an account deletion is requested, all personal profiles, identity records, and attached documents are permanently purged from active systems within 30 days.</li>
        </ul>

        <h3>B. How You Can Request Complete Deletion</h3>
        <p>ClaimsGuru provides convenient and accessible methods to permanently delete your account and personal data:</p>

        <div class="highlight-box">
          <strong>1. In-App One-Click Account Deletion</strong>
          <p>
            Open the ClaimsGuru mobile app &rarr; Go to <strong>Profile / Settings</strong> &rarr; 
            Scroll down to <strong>Delete Account</strong> &rarr; Confirm deletion. 
            Your account, profile data, Microsoft Entra credentials, and medical documents will be permanently purged.
          </p>
        </div>

        <div class="highlight-box">
          <strong>2. Direct Email Request</strong>
          <p>
            Email our privacy team at <a href="mailto:info@waferwire.com">info@waferwire.com</a> with the subject 
            <em>"ClaimsGuru Data Deletion Request"</em> from your registered account email. 
            We will verify your request and confirm permanent erasure within 30 business days.
          </p>
        </div>
      </section>

      <!-- Section 6 -->
      <section id="security">
        <h2>6. Security Safeguards</h2>
        <p>
          WaferWire LLC implements multi-layered security controls to safeguard sensitive health information:
        </p>
        <ul>
          <li><strong>At-Rest Encryption:</strong> All blob storage containers and databases use AES-256 encryption.</li>
          <li><strong>In-Transit Encryption:</strong> Modern TLS 1.3 encryption with strict HTTP Strict Transport Security (HSTS).</li>
          <li><strong>Role-Based Access Control (RBAC):</strong> Strict separation between patients, adjusters, and platform administrators.</li>
          <li><strong>Least Privilege Architecture:</strong> Backend services operate on isolated microservice scopes with no unrestricted root privileges.</li>
          <li><strong>OWASP Hardening:</strong> Anti-clickjacking (X-Frame-Options: DENY), content sniffing prevention (X-Content-Type-Options: nosniff), and rate-limiting on all authentication endpoints.</li>
        </ul>
      </section>

      <!-- Section 7 -->
      <section id="children">
        <h2>7. Children's Privacy</h2>
        <p>
          ClaimsGuru is not intended for unsupervised use by minors under the age of 18. Where claims are filed for 
          minor children or dependents, all data is submitted and managed through the parent or legal guardian's 
          verified account with explicit parental consent.
        </p>
      </section>

      <!-- Section 8 -->
      <section id="global-access">
        <h2>8. Worldwide Accessibility & Regulatory Compliance</h2>
        <p>
          In accordance with Google Play Developer Policies:
        </p>
        <ul>
          <li>This Privacy Policy is hosted on an active, publicly accessible HTTPS URL with a valid SSL certificate.</li>
          <li>It is accessible worldwide without geographical restrictions, IP geoblocking, or login requirements.</li>
          <li>It is presented on a standard, non-editable HTML webpage (not a PDF or downloadable file).</li>
          <li>It comprehensively discloses the exact data types collected, processing steps, retention schedules, and contact details.</li>
        </ul>
      </section>

      <!-- Section 9 -->
      <section id="contact">
        <h2>9. Company Details & How to Contact Us About Privacy Questions</h2>
        <p>
          If you have questions, inquiries, concerns, or complaints regarding this Privacy Policy or our 
          handling of your personal information, please contact our team:
        </p>

        <div class="contact-card">
          <div class="contact-item">
            <span class="contact-label">Product Name:</span>
            <span class="contact-val">ClaimsGuru</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Parent Company:</span>
            <span class="contact-val">WaferWire LLC</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Postal Address:</span>
            <span class="contact-val">4034 148TH Ave NE, Redmond - 98052-5165, United States (US)</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Email Inquiries:</span>
            <span class="contact-val"><a href="mailto:info@waferwire.com">info@waferwire.com</a></span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Telephone:</span>
            <span class="contact-val"><a href="tel:+14252460195">+1 (425) 246-0195</a></span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Official Website:</span>
            <span class="contact-val"><a href="https://waferwire.com/" target="_blank" rel="noopener noreferrer">https://waferwire.com/</a></span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Privacy Office:</span>
            <span class="contact-val">Attention: Data Protection Officer (info@waferwire.com)</span>
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer>
    <p>&copy; 2026 ClaimsGuru · A product of <a href="https://waferwire.com/" target="_blank" rel="noopener noreferrer">WaferWire LLC</a>. All rights reserved.</p>
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Redmond, WA, United States · <a href="mailto:info@waferwire.com">info@waferwire.com</a> · +1 (425) 246-0195
    </p>
  </footer>

</body>
</html>"""
