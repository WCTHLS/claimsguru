"""
ClaimsGuru Privacy Policy Module
Product of WaferWire LLC

Provides both standard non-editable HTML webpage and structured JSON API
compliant with Google Play Developer User Data Policy, HIPAA, and applicable privacy standards.
"""

from typing import Any, Dict

LAST_UPDATED = "October 22, 2026"
EFFECTIVE_DATE = "October 22, 2026"
VERSION = "2.0.0"

COMPANY_DETAILS: Dict[str, str] = {
    "name": "WaferWire LLC",
    "product": "ClaimsGuru",
    "address": "4034 148TH Ave NE, Redmond - 98052-5165, United States (US)",
    "email": "info@waferwire.com",
    "website": "https://www.wct-health.com/",
    "account_deletion": "https://www.wct-health.com/delete-account",
}

PRIVACY_POLICY_DATA: Dict[str, Any] = {
    "title": "ClaimsGuru Privacy Policy",
    "product_name": "ClaimsGuru",
    "owner": COMPANY_DETAILS,
    "last_updated": LAST_UPDATED,
    "effective_date": EFFECTIVE_DATE,
    "version": VERSION,
    "summary": (
        "ClaimsGuru is a health insurance claim management and document-processing platform operated by WaferWire LLC. "
        "This Privacy Policy explains how ClaimsGuru collects, uses, processes, stores, protects, and shares personal "
        "information when users access our mobile application and related services."
    ),
    "sections": [
        {
            "id": "introduction",
            "title": "1. Introduction",
            "content": (
                "ClaimsGuru is a health insurance claim management and document-processing platform operated by "
                "WaferWire LLC ('we,' 'us,' or 'our').\n\n"
                "This Privacy Policy explains how ClaimsGuru collects, uses, processes, stores, protects, and shares "
                "personal information when users access our mobile application and related services.\n\n"
                "ClaimsGuru helps patients and authorized organizational users process medical documents and insurance "
                "policy documents, validate claim information against policy terms, and submit claims to participating "
                "insurance companies and Third-Party Administrators (TPAs) enrolled on the platform.\n\n"
                "ClaimsGuru supports administrative claim processing. The relevant insurance company or TPA is responsible "
                "for reviewing the claim, making the final approval or rejection decision, and handling reimbursement or "
                "settlement outside ClaimsGuru.\n\n"
                "By using ClaimsGuru, you acknowledge that you have read this Privacy Policy. Where consent is required by "
                "applicable law, we will obtain it separately."
            ),
        },
        {
            "id": "information-we-collect",
            "title": "2. Information We Collect",
            "content": "The information we collect depends on how you use ClaimsGuru and the features available to your account.",
            "subsections": [
                {
                    "title": "2.1 Personal Information",
                    "description": "We may collect the following information when you create or use an account:",
                    "items": [
                        "Name: To identify your account and associate it with your claim.",
                        "Email address: For account management, authentication where applicable, claim-related communication, and service notifications.",
                        "Phone number: For contact, account verification, and relevant service-related communication where applicable.",
                        "Other profile information: Information such as gender, if provided in your profile or registration form.",
                        "Account and role information: Information needed to identify patients, organizational users, and authorized personnel.",
                    ],
                },
                {
                    "title": "2.2 Medical and Health Information",
                    "description": "When you submit a claim, ClaimsGuru may process sensitive health information contained in your uploaded documents, including:",
                    "items": [
                        "Medical bills and hospital invoices.",
                        "Discharge summaries.",
                        "Prescriptions, diagnostic reports, and other medical records.",
                        "Diagnoses and associated medical codes extracted from documents.",
                        "Treatment details and other information relevant to the submitted claim.",
                    ],
                    "note": "We use this information only for claim processing, document analysis, policy-related validation, and associated claim-management functions.",
                },
                {
                    "title": "2.3 Insurance Policy and Claim Information",
                    "description": "We may collect and process:",
                    "items": [
                        "Insurance policy documents and policy identifiers.",
                        "Insurer and TPA information.",
                        "Policy coverage, limits, exclusions, and relevant conditions.",
                        "Claim details and supporting documentation.",
                        "Extracted document information and validation results.",
                        "Claim submission records, queries, and status updates.",
                        "Approval, rejection, or settlement status information provided by authorized users or participating insurers/TPAs.",
                    ],
                    "note": "This information helps users and authorized organizational personnel manage and review insurance claims.",
                },
                {
                    "title": "2.4 Photos and Files",
                    "content": (
                        "When you choose to upload a photo, PDF, or another supported file, ClaimsGuru processes the "
                        "selected file to perform the requested claim-related function.\n\n"
                        "Uploaded files may contain personal, medical, and insurance information. We use these files to "
                        "extract relevant information, validate claim details, and prepare or submit claims.\n\n"
                        "The application should access only the photos or files needed for the feature being used."
                    ),
                },
                {
                    "title": "2.5 Device and Notification Information",
                    "content": (
                        "If push notifications are enabled, ClaimsGuru may collect a device or app identifier, such as a "
                        "push-notification token, along with relevant platform information.\n\n"
                        "This information is used to deliver notifications relating to claim status, account activity, or other "
                        "relevant service updates."
                    ),
                },
                {
                    "title": "2.6 Technical and Security Information",
                    "content": (
                        "Our systems and service providers may process technical information necessary to operate and "
                        "secure the application, such as connection information, authentication events, and security logs.\n\n"
                        "Where diagnostic or analytics services are used, the information collected will depend on the "
                        "services enabled in the deployed application and their configuration."
                    ),
                },
            ],
        },
        {
            "id": "how-we-use-information",
            "title": "3. How We Use Your Information",
            "content": "We use the information described in this policy to:",
            "items": [
                "Create and manage user accounts.",
                "Authenticate users and enforce appropriate access permissions.",
                "Receive, store, and process uploaded medical and insurance documents.",
                "Extract relevant information from documents using document-processing and optical character recognition (OCR) technologies.",
                "Compare submitted claim information against the supplied insurance policy terms and applicable validation rules.",
                "Identify missing information, inconsistencies, or potential policy-related issues.",
                "Prepare and submit claim information to the insurer or TPA selected for the claim.",
                "Display claim status, queries, and review outcomes in the application.",
                "Send claim-processing emails, push notifications, and other relevant service communications.",
                "Maintain application security, troubleshoot technical issues, prevent misuse, and meet applicable legal obligations.",
            ],
            "note": "ClaimsGuru's document extraction and validation functions assist with administrative processing. They do not guarantee coverage, establish a final entitlement to benefits, or guarantee claim approval.",
        },
        {
            "id": "how-claim-submission-works",
            "title": "4. How Claim Submission Works",
            "content": (
                "ClaimsGuru allows patients to submit claims to participating insurance companies and TPAs enrolled on the platform.\n\n"
                "When a user selects the relevant insurer or TPA and submits a claim through the application, ClaimsGuru "
                "transmits the necessary claim information and supporting documents through the platform's claim-processing workflow.\n\n"
                "The information transmitted may include:\n"
                "• Patient and claim identification details.\n"
                "• Relevant medical documents.\n"
                "• Insurance policy documents and policy information.\n"
                "• Extracted medical and claim-related information.\n"
                "• Supporting documents required for review.\n\n"
                "The selected insurer or TPA receives the claim information through its authorized access to ClaimsGuru and reviews "
                "the claim according to its own processes.\n\n"
                "Authorized insurer or TPA personnel may update the claim status, request additional information, or record an approval, "
                "rejection, or settlement outcome.\n\n"
                "ClaimsGuru does not itself issue insurance policies, pay reimbursements, or transfer settlement funds. Any "
                "reimbursement or settlement is handled by the relevant insurer or TPA outside the ClaimsGuru application.\n\n"
                "Users should review the selected recipient and claim details before submission. Once a claim is submitted, "
                "the recipient may process the information in accordance with its own obligations and policies."
            ),
        },
        {
            "id": "sharing-of-information",
            "title": "5. Sharing of Information",
            "content": (
                "We do not sell personal information or medical documents to advertisers or data brokers.\n\n"
                "We may disclose or transfer information in the following circumstances."
            ),
            "subsections": [
                {
                    "title": "5.1 User-Directed Claim Submission",
                    "content": (
                        "When a user initiates or authorizes submission of a claim to a selected participating insurer or TPA, "
                        "we transmit the information needed for that claim to the selected recipient.\n\n"
                        "This transfer is necessary to provide the claim-submission service requested by the user.\n\n"
                        "The insurer or TPA may be a separate legal organization and may process submitted information under its "
                        "own privacy policy and applicable legal obligations."
                    ),
                },
                {
                    "title": "5.2 Service Providers",
                    "content": (
                        "We may use service providers to operate ClaimsGuru, including providers of:\n"
                        "• Cloud hosting and storage.\n"
                        "• Database and application infrastructure.\n"
                        "• Document processing and OCR.\n"
                        "• Authentication and identity management.\n"
                        "• Email delivery and push notifications.\n"
                        "• Security, monitoring, and technical support.\n\n"
                        "These providers may process information on our behalf as necessary to deliver their services, "
                        "subject to applicable contractual and security requirements.\n\n"
                        "The specific providers and data processed depend on the services enabled in our deployed application."
                    ),
                },
                {
                    "title": "5.3 Legal and Security Requirements",
                    "content": (
                        "We may disclose information where required by applicable law, a valid legal process, or a competent "
                        "authority. We may also disclose information where reasonably necessary to protect the security, rights, "
                        "or safety of users, the company, or the service, subject to applicable law."
                    ),
                },
            ],
        },
        {
            "id": "data-storage-and-security",
            "title": "6. Data Storage and Security",
            "content": (
                "ClaimsGuru uses technical and organizational safeguards designed to protect personal and sensitive information "
                "against unauthorized access, loss, misuse, alteration, or disclosure.\n\n"
                "Depending on the relevant system, safeguards may include:\n"
                "• Encryption of data transmitted over secure connections.\n"
                "• Authentication and access controls.\n"
                "• Role-based access to claim information.\n"
                "• Protected cloud infrastructure and storage.\n"
                "• Security monitoring and operational safeguards.\n\n"
                "Access to medical and insurance information should be limited to authorized users who need it for the relevant "
                "claim-processing functions.\n\n"
                "No electronic system or transmission method can guarantee absolute security. We continually seek to maintain "
                "appropriate safeguards for the information processed through our services."
            ),
        },
        {
            "id": "data-retention",
            "title": "7. Data Retention",
            "content": (
                "We retain personal information for as long as reasonably necessary to provide ClaimsGuru's services, process and "
                "manage claims, maintain security, resolve disputes, and comply with applicable legal or contractual obligations.\n\n"
                "Retention periods may vary depending on the information involved, the claim's status, applicable requirements, "
                "and relevant agreements.\n\n"
                "When information is no longer required or when an account is deleted, it is permanently deleted from our active systems. "
                "We do not retain records or maintain backup copies once account deletion has been processed."
            ),
        },
        {
            "id": "account-and-data-deletion",
            "title": "8. Account and Data Deletion",
            "content": (
                "Users may request account deletion through our account deletion portal:\n"
                "https://www.wct-health.com/delete-account\n\n"
                "Users may also contact our privacy contact listed below for assistance.\n\n"
                "We will verify and process deletion requests according to our deletion procedures.\n\n"
                "When an account is deleted, we permanently delete associated personal information, authentication credentials, "
                "and uploaded medical documents from our systems. We do not keep any records or maintain backup copies once an account is deleted.\n\n"
                "Deleting an account may affect access to claim history and other application features.\n\n"
                "Information previously submitted to an insurer or Third-Party Administrator (TPA) by the user action may also be "
                "subject to that organization's independent retention obligations. Deleting your ClaimsGuru account does not automatically "
                "delete records held independently by an insurer or TPA."
            ),
            "deletion_portal_url": "https://www.wct-health.com/delete-account",
        },
        {
            "id": "user-responsibilities",
            "title": "9. User Responsibilities",
            "content": "Users should:",
            "items": [
                "Provide accurate account and claim information.",
                "Upload only documents they are authorized to submit.",
                "Review the selected insurer or TPA and the claim details before submission.",
                "Protect their account credentials and report suspected unauthorized access.",
                "Avoid submitting information unrelated to the intended claim.",
            ],
            "note": "Users should understand that extracted information may contain errors and that the insurer or TPA makes the final claim decision.",
        },
        {
            "id": "childrens-information",
            "title": "10. Children's Information",
            "content": (
                "ClaimsGuru is designed for its intended claim-management users. Where a legitimate claim requires information "
                "about a minor, it should be submitted by an authorized parent, guardian, or representative in accordance with "
                "applicable law.\n\n"
                "We do not knowingly collect children's information for unrelated purposes."
            ),
        },
        {
            "id": "third-party-services",
            "title": "11. Third-Party Services and External Policies",
            "content": (
                "ClaimsGuru may integrate with external service providers and participating insurers or TPAs to provide its functions.\n\n"
                "Those organizations may have their own privacy policies and data-handling practices. Their processing of information "
                "under their own responsibilities is governed by the applicable policies, agreements, and laws.\n\n"
                "Users should consult the relevant organization for information about its independent handling of submitted claims."
            ),
        },
        {
            "id": "changes-to-policy",
            "title": "12. Changes to This Privacy Policy",
            "content": (
                "We may update this Privacy Policy to reflect changes in our services, data practices, or legal requirements.\n\n"
                "The latest version will be published at our designated privacy-policy URL with an updated effective date. "
                "Where required, we will provide additional notice of material changes."
            ),
        },
        {
            "id": "contact-us",
            "title": "13. Contact Us",
            "content": (
                "For questions about this Privacy Policy, personal information, or account deletion, contact:\n\n"
                "Company: WaferWire LLC\n"
                "Application: ClaimsGuru\n"
                "Email: info@waferwire.com\n"
                "Website: https://www.wct-health.com/\n"
                "Account deletion: https://www.wct-health.com/delete-account\n\n"
                "Please do not email medical documents or other sensitive personal information unless our support team specifically "
                "requests them through an appropriate channel.\n\n"
                "This Privacy Policy describes ClaimsGuru's data-handling practices and must be kept consistent with the application's "
                "actual features, deployed service providers, and operational procedures."
            ),
            "contact_details": {
                "company": "WaferWire LLC",
                "application": "ClaimsGuru",
                "email": "info@waferwire.com",
                "website": "https://www.wct-health.com/",
                "account_deletion": "https://www.wct-health.com/delete-account",
                "address": "4034 148TH Ave NE, Redmond - 98052-5165, United States (US)",
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
  <meta name="description" content="ClaimsGuru Privacy Policy. Learn how ClaimsGuru by WaferWire LLC collects, uses, processes, stores, protects, and shares personal and medical claim information.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.wct-health.com/privacy&policy">
  <style>
    :root {{
      --primary: #0d9488;
      --primary-dark: #0f766e;
      --primary-light: #ccfbf1;
      --navy: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
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
      color: var(--slate-700);
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
    .sub-card {{
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
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
      width: 160px;
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
    <p class="subtitle">Health insurance claim management and document-processing platform operated by WaferWire LLC.</p>
    <div class="meta-bar">
      <span><strong>Application:</strong> ClaimsGuru</span>
      <span><strong>Company:</strong> WaferWire LLC</span>
      <span><strong>Effective Date:</strong> {EFFECTIVE_DATE}</span>
      <span><strong>Last Updated:</strong> {LAST_UPDATED}</span>
    </div>
  </header>

  <main class="container">
    <div class="notice-card">
      <p>
        <strong>Transparency & Trust Notice:</strong> This Privacy Policy applies to the 
        <strong>ClaimsGuru</strong> mobile application, web portal, and related services operated by 
        <strong>WaferWire LLC</strong>. It is publicly accessible worldwide without geographical restrictions or login requirements.
      </p>
    </div>

    <div class="content-card">
      <!-- Section 1 -->
      <section id="introduction">
        <h2>1. Introduction</h2>
        <p>ClaimsGuru is a health insurance claim management and document-processing platform operated by WaferWire LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).</p>
        <p>This Privacy Policy explains how ClaimsGuru collects, uses, processes, stores, protects, and shares personal information when users access our mobile application and related services.</p>
        <p>ClaimsGuru helps patients and authorized organizational users process medical documents and insurance policy documents, validate claim information against policy terms, and submit claims to participating insurance companies and Third-Party Administrators (TPAs) enrolled on the platform.</p>
        <p>ClaimsGuru supports administrative claim processing. The relevant insurance company or TPA is responsible for reviewing the claim, making the final approval or rejection decision, and handling reimbursement or settlement outside ClaimsGuru.</p>
        <p>By using ClaimsGuru, you acknowledge that you have read this Privacy Policy. Where consent is required by applicable law, we will obtain it separately.</p>
      </section>

      <!-- Section 2 -->
      <section id="information-we-collect">
        <h2>2. Information We Collect</h2>
        <p>The information we collect depends on how you use ClaimsGuru and the features available to your account.</p>

        <div class="sub-card">
          <h3>2.1 Personal Information</h3>
          <p>We may collect the following information when you create or use an account:</p>
          <ul>
            <li><strong>Name:</strong> To identify your account and associate it with your claim.</li>
            <li><strong>Email address:</strong> For account management, authentication where applicable, claim-related communication, and service notifications.</li>
            <li><strong>Phone number:</strong> For contact, account verification, and relevant service-related communication where applicable.</li>
            <li><strong>Other profile information:</strong> Information such as gender, if provided in your profile or registration form.</li>
            <li><strong>Account and role information:</strong> Information needed to identify patients, organizational users, and authorized personnel.</li>
          </ul>
        </div>

        <div class="sub-card">
          <h3>2.2 Medical and Health Information</h3>
          <p>When you submit a claim, ClaimsGuru may process sensitive health information contained in your uploaded documents, including:</p>
          <ul>
            <li>Medical bills and hospital invoices.</li>
            <li>Discharge summaries.</li>
            <li>Prescriptions, diagnostic reports, and other medical records.</li>
            <li>Diagnoses and associated medical codes extracted from documents.</li>
            <li>Treatment details and other information relevant to the submitted claim.</li>
          </ul>
          <p style="font-size: 14px; font-style: italic; color: var(--slate-600); margin-bottom: 0;">We use this information only for claim processing, document analysis, policy-related validation, and associated claim-management functions.</p>
        </div>

        <div class="sub-card">
          <h3>2.3 Insurance Policy and Claim Information</h3>
          <p>We may collect and process:</p>
          <ul>
            <li>Insurance policy documents and policy identifiers.</li>
            <li>Insurer and TPA information.</li>
            <li>Policy coverage, limits, exclusions, and relevant conditions.</li>
            <li>Claim details and supporting documentation.</li>
            <li>Extracted document information and validation results.</li>
            <li>Claim submission records, queries, and status updates.</li>
            <li>Approval, rejection, or settlement status information provided by authorized users or participating insurers/TPAs.</li>
          </ul>
          <p style="font-size: 14px; font-style: italic; color: var(--slate-600); margin-bottom: 0;">This information helps users and authorized organizational personnel manage and review insurance claims.</p>
        </div>

        <div class="sub-card">
          <h3>2.4 Photos and Files</h3>
          <p>When you choose to upload a photo, PDF, or another supported file, ClaimsGuru processes the selected file to perform the requested claim-related function.</p>
          <p>Uploaded files may contain personal, medical, and insurance information. We use these files to extract relevant information, validate claim details, and prepare or submit claims.</p>
          <p style="font-weight: 600; color: var(--slate-800); margin-bottom: 0;">The application should access only the photos or files needed for the feature being used.</p>
        </div>

        <div class="sub-card">
          <h3>2.5 Device and Notification Information</h3>
          <p>If push notifications are enabled, ClaimsGuru may collect a device or app identifier, such as a push-notification token, along with relevant platform information.</p>
          <p style="margin-bottom: 0;">This information is used to deliver notifications relating to claim status, account activity, or other relevant service updates.</p>
        </div>

        <div class="sub-card">
          <h3>2.6 Technical and Security Information</h3>
          <p>Our systems and service providers may process technical information necessary to operate and secure the application, such as connection information, authentication events, and security logs.</p>
          <p style="margin-bottom: 0;">Where diagnostic or analytics services are used, the information collected will depend on the services enabled in the deployed application and their configuration.</p>
        </div>
      </section>

      <!-- Section 3 -->
      <section id="how-we-use-information">
        <h2>3. How We Use Your Information</h2>
        <p>We use the information described in this policy to:</p>
        <ul>
          <li>Create and manage user accounts.</li>
          <li>Authenticate users and enforce appropriate access permissions.</li>
          <li>Receive, store, and process uploaded medical and insurance documents.</li>
          <li>Extract relevant information from documents using document-processing and optical character recognition (OCR) technologies.</li>
          <li>Compare submitted claim information against the supplied insurance policy terms and applicable validation rules.</li>
          <li>Identify missing information, inconsistencies, or potential policy-related issues.</li>
          <li>Prepare and submit claim information to the insurer or TPA selected for the claim.</li>
          <li>Display claim status, queries, and review outcomes in the application.</li>
          <li>Send claim-processing emails, push notifications, and other relevant service communications.</li>
          <li>Maintain application security, troubleshoot technical issues, prevent misuse, and meet applicable legal obligations.</li>
        </ul>
        <div class="highlight-box">
          <strong>Administrative Processing Notice</strong>
          <p>ClaimsGuru's document extraction and validation functions assist with administrative processing. They do not guarantee coverage, establish a final entitlement to benefits, or guarantee claim approval.</p>
        </div>
      </section>

      <!-- Section 4 -->
      <section id="how-claim-submission-works">
        <h2>4. How Claim Submission Works</h2>
        <p>ClaimsGuru allows patients to submit claims to participating insurance companies and TPAs enrolled on the platform.</p>
        <p>When a user selects the relevant insurer or TPA and submits a claim through the application, ClaimsGuru transmits the necessary claim information and supporting documents through the platform's claim-processing workflow.</p>
        <p>The information transmitted may include:</p>
        <ul>
          <li>Patient and claim identification details.</li>
          <li>Relevant medical documents.</li>
          <li>Insurance policy documents and policy information.</li>
          <li>Extracted medical and claim-related information.</li>
          <li>Supporting documents required for review.</li>
        </ul>
        <p>The selected insurer or TPA receives the claim information through its authorized access to ClaimsGuru and reviews the claim according to its own processes.</p>
        <p>Authorized insurer or TPA personnel may update the claim status, request additional information, or record an approval, rejection, or settlement outcome.</p>
        <p>ClaimsGuru does not itself issue insurance policies, pay reimbursements, or transfer settlement funds. Any reimbursement or settlement is handled by the relevant insurer or TPA outside the ClaimsGuru application.</p>
        <p>Users should review the selected recipient and claim details before submission. Once a claim is submitted, the recipient may process the information in accordance with its own obligations and policies.</p>
      </section>

      <!-- Section 5 -->
      <section id="sharing-of-information">
        <h2>5. Sharing of Information</h2>
        <p><strong>We do not sell personal information or medical documents to advertisers or data brokers.</strong></p>
        <p>We may disclose or transfer information in the following circumstances.</p>

        <div class="sub-card">
          <h3>5.1 User-Directed Claim Submission</h3>
          <p>When a user initiates or authorizes submission of a claim to a selected participating insurer or TPA, we transmit the information needed for that claim to the selected recipient.</p>
          <p>This transfer is necessary to provide the claim-submission service requested by the user.</p>
          <p style="margin-bottom: 0;">The insurer or TPA may be a separate legal organization and may process submitted information under its own privacy policy and applicable legal obligations.</p>
        </div>

        <div class="sub-card">
          <h3>5.2 Service Providers</h3>
          <p>We may use service providers to operate ClaimsGuru, including providers of:</p>
          <ul>
            <li>Cloud hosting and storage.</li>
            <li>Database and application infrastructure.</li>
            <li>Document processing and OCR.</li>
            <li>Authentication and identity management.</li>
            <li>Email delivery and push notifications.</li>
            <li>Security, monitoring, and technical support.</li>
          </ul>
          <p>These providers may process information on our behalf as necessary to deliver their services, subject to applicable contractual and security requirements.</p>
          <p style="margin-bottom: 0;">The specific providers and data processed depend on the services enabled in our deployed application.</p>
        </div>

        <div class="sub-card">
          <h3>5.3 Legal and Security Requirements</h3>
          <p style="margin-bottom: 0;">We may disclose information where required by applicable law, a valid legal process, or a competent authority. We may also disclose information where reasonably necessary to protect the security, rights, or safety of users, the company, or the service, subject to applicable law.</p>
        </div>
      </section>

      <!-- Section 6 -->
      <section id="data-storage-and-security">
        <h2>6. Data Storage and Security</h2>
        <p>ClaimsGuru uses technical and organizational safeguards designed to protect personal and sensitive information against unauthorized access, loss, misuse, alteration, or disclosure.</p>
        <p>Depending on the relevant system, safeguards may include:</p>
        <ul>
          <li>Encryption of data transmitted over secure connections.</li>
          <li>Authentication and access controls.</li>
          <li>Role-based access to claim information.</li>
          <li>Protected cloud infrastructure and storage.</li>
          <li>Security monitoring and operational safeguards.</li>
        </ul>
        <p>Access to medical and insurance information should be limited to authorized users who need it for the relevant claim-processing functions.</p>
        <p>No electronic system or transmission method can guarantee absolute security. We continually seek to maintain appropriate safeguards for the information processed through our services.</p>
      </section>

      <!-- Section 7 -->
      <section id="data-retention">
        <h2>7. Data Retention</h2>
        <p>We retain personal information for as long as reasonably necessary to provide ClaimsGuru's services, process and manage claims, maintain security, resolve disputes, and comply with applicable legal or contractual obligations.</p>
        <p>Retention periods may vary depending on the information involved, the claim's status, applicable requirements, and relevant agreements.</p>
        <p>When information is no longer required or when an account is deleted, it is permanently deleted from our active systems. We do not retain records or maintain backup copies once account deletion has been processed.</p>
      </section>

      <!-- Section 8 -->
      <section id="account-and-data-deletion">
        <h2>8. Account and Data Deletion</h2>
        <p>Users may request account deletion through our account deletion portal:</p>
        <div class="highlight-box">
          <strong>Account Deletion Portal</strong>
          <p><a href="https://www.wct-health.com/delete-account" target="_blank" rel="noopener noreferrer">https://www.wct-health.com/delete-account</a></p>
        </div>
        <p>Users may also contact our privacy contact listed below for assistance.</p>
        <p>We will verify and process deletion requests according to our deletion procedures.</p>
        <p>When an account is deleted, we permanently delete associated personal information, authentication credentials, and uploaded medical documents from our systems. We do not keep any records or maintain backup copies once an account is deleted.</p>
        <p>Deleting an account may affect access to claim history and other application features.</p>
        <p>Information previously submitted to an insurer or Third-Party Administrator (TPA) by the user action may also be subject to that organization's independent retention obligations. Deleting your ClaimsGuru account does not automatically delete records held independently by an insurer or TPA.</p>
      </section>

      <!-- Section 9 -->
      <section id="user-responsibilities">
        <h2>9. User Responsibilities</h2>
        <p>Users should:</p>
        <ul>
          <li>Provide accurate account and claim information.</li>
          <li>Upload only documents they are authorized to submit.</li>
          <li>Review the selected insurer or TPA and the claim details before submission.</li>
          <li>Protect their account credentials and report suspected unauthorized access.</li>
          <li>Avoid submitting information unrelated to the intended claim.</li>
        </ul>
        <p>Users should understand that extracted information may contain errors and that the insurer or TPA makes the final claim decision.</p>
      </section>

      <!-- Section 10 -->
      <section id="childrens-information">
        <h2>10. Children's Information</h2>
        <p>ClaimsGuru is designed for its intended claim-management users. Where a legitimate claim requires information about a minor, it should be submitted by an authorized parent, guardian, or representative in accordance with applicable law.</p>
        <p>We do not knowingly collect children's information for unrelated purposes.</p>
      </section>

      <!-- Section 11 -->
      <section id="third-party-services">
        <h2>11. Third-Party Services and External Policies</h2>
        <p>ClaimsGuru may integrate with external service providers and participating insurers or TPAs to provide its functions.</p>
        <p>Those organizations may have their own privacy policies and data-handling practices. Their processing of information under their own responsibilities is governed by the applicable policies, agreements, and laws.</p>
        <p>Users should consult the relevant organization for information about its independent handling of submitted claims.</p>
      </section>

      <!-- Section 12 -->
      <section id="changes-to-policy">
        <h2>12. Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy to reflect changes in our services, data practices, or legal requirements.</p>
        <p>The latest version will be published at our designated privacy-policy URL with an updated effective date. Where required, we will provide additional notice of material changes.</p>
      </section>

      <!-- Section 13 -->
      <section id="contact-us">
        <h2>13. Contact Us</h2>
        <p>For questions about this Privacy Policy, personal information, or account deletion, contact:</p>

        <div class="contact-card">
          <div class="contact-item">
            <span class="contact-label">Company:</span>
            <span class="contact-val">WaferWire LLC</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Application:</span>
            <span class="contact-val">ClaimsGuru</span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Email:</span>
            <span class="contact-val"><a href="mailto:info@waferwire.com">info@waferwire.com</a></span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Website:</span>
            <span class="contact-val"><a href="https://www.wct-health.com/" target="_blank" rel="noopener noreferrer">https://www.wct-health.com/</a></span>
          </div>
          <div class="contact-item">
            <span class="contact-label">Account deletion:</span>
            <span class="contact-val"><a href="https://www.wct-health.com/delete-account" target="_blank" rel="noopener noreferrer">https://www.wct-health.com/delete-account</a></span>
          </div>
        </div>

        <p style="margin-top: 20px; font-size: 14px; color: var(--slate-600);">
          Please do not email medical documents or other sensitive personal information unless our support team specifically requests them through an appropriate channel.
        </p>
        <p style="font-size: 13px; font-style: italic; color: var(--slate-600); margin-top: 8px;">
          This Privacy Policy describes ClaimsGuru's data-handling practices and must be kept consistent with the application's actual features, deployed service providers, and operational procedures.
        </p>
      </section>
    </div>
  </main>

  <footer>
    <p>&copy; 2026 ClaimsGuru · Operated by <a href="https://www.wct-health.com/" target="_blank" rel="noopener noreferrer">WaferWire LLC</a>. All rights reserved.</p>
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      <a href="mailto:info@waferwire.com">info@waferwire.com</a> · <a href="https://www.wct-health.com/delete-account">Account Deletion</a>
    </p>
  </footer>

</body>
</html>"""
