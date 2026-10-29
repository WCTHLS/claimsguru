import os
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139)
            self.cell(0, 8, "ClaimsGuru | Enterprise Capabilities & Security Brief", align="L")
            self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(226, 232, 240)
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 8, "Confidential - WaferWire Cloud Technologies | All Rights Reserved", align="C")

def create_brief_pdf(output_path):
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    # --- Cover / Title Header ---
    pdf.set_fill_color(15, 23, 42) # Slate-900
    pdf.rect(15, 15, 180, 36, "F")
    
    pdf.set_xy(20, 20)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 9, "ClaimsGuru Enterprise Solution", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_x(20)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(56, 189, 248) # Sky-400
    pdf.cell(0, 7, "Feature & Capability Matrix  |  Security & Architecture Brief", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(20)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(203, 213, 225)
    pdf.cell(0, 6, "Target Audience: Enterprise Healthcare Providers, Insurers, TPAs & Executive Stakeholders", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(56)

    # --- Section 1: Executive Summary ---
    def section_header(title):
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(14, 165, 233)
        pdf.set_line_width(0.8)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 50, pdf.get_y())
        pdf.ln(3)

    section_header("1. Executive Summary")
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(51, 65, 85)
    summary_text = (
        "Health insurance reimbursement historically faces friction: 15-30 day turnaround times, over 18% "
        "technical rejection rates due to missing bills or misidentified patients, and high administrative burdens on "
        "hospital front desks and TPAs.\n\n"
        "ClaimsGuru (developed by WaferWire Cloud Technologies) is an enterprise-grade AI-assisted health insurance claim intake, "
        "review, and adjudication platform. It automates multi-document OCR, enforces fail-fast patient identity verification, "
        "predicts claim adjudication risks, automates ICD-10 medical coding, and generates standard IRDAI dossiers with digital signatures."
    )
    pdf.multi_cell(0, 5, summary_text)
    pdf.ln(4)

    # --- Section 2: Core Capabilities Matrix ---
    section_header("2. Core Features & Capabilities Matrix")
    
    capabilities = [
        ("Multi-Format Intake", "Accepts PDF, JPEG, PNG, TIFF up to 25MB. Built-in camera scanner with perspective correction and SHA-256 fingerprint deduplication."),
        ("Document Classifier", "Auto-categorizes into Final Bills, Discharge Summaries, Pharmacy Bills, Diagnostic/Lab Reports, Receipts, and KYC cards."),
        ("Fail-Fast Identity Gate", "Consensus cross-document matching of patient name, gender, and DOB. Auto-purges mismatched files without breaking validated claims."),
        ("Deep OCR & Extraction", "Multi-engine OCR extracting printed & cursive doctor handwriting, tabular invoices, tax summaries, and medical imaging flags."),
        ("Clinical NER & ICD-10", "Biomedical entity extraction mapping diagnoses to ICD-10-CM and procedures to CPT codes for TPA auditor review."),
        ("Deduction & Tariff Engine", "Categorizes Room, ICU, OT, and Pharmacy expenses. Identifies non-payable consumables per IRDAI schedules upfront."),
        ("Adjudication Prediction", "Dual-engine ML model (XGBoost + LightGBM) predicting approval probability and warning of rejection triggers pre-submission."),
        ("IRDAI Dossier & e-Sign", "Auto-populates IRDAI Claim Form (Part A & B) with touchscreen/mouse digital signature pad and complete PDF export."),
        ("Universal TPA Routing", "Pre-configured for Star Health, ICICI Lombard, Care, HDFC ERGO, Niva Bupa, plus a Universal 'Other' adapter for any TPA."),
        ("Document Request Cycle", "Automated 'DOCUMENTS_REQUESTED' state machine with real-time patient notifications and one-click incremental uploads."),
        ("Role-Based Portals", "Patient Self-Service Portal, Hospital/TPA Auditor Review Console with audit trails, and Enterprise Admin Console.")
    ]

    col_w1 = 48
    col_w2 = 132

    for title, desc in capabilities:
        if pdf.get_y() > 265:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(col_w1, 6.5, f"  {title}", border="LBT", fill=True)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 65, 85)
        pdf.multi_cell(col_w2, 4.5, desc, border="RBT")
        pdf.ln(1.5)

    pdf.ln(3)

    # --- Section 3: Technical & Cloud Architecture ---
    if pdf.get_y() > 240:
        pdf.add_page()
    section_header("3. Technical Architecture & System Resilience")

    arch_text = (
        "ClaimsGuru is built on an event-driven, cloud-native microservices architecture:\n\n"
        "- Distributed Celery Asynchronous Engine: Workloads are strictly isolated into dedicated queues:\n"
        "    * ocr_queue: High-compute OCR and vision processing.\n"
        "    * parser_queue: Layout parsing, entity extraction, and identity validation.\n"
        "    * default_queue: Instant transactional workflows, DB updates, and notifications.\n\n"
        "- Managed State Machine: Enforces deterministic progression (UPLOADED -> OCR_IN_PROGRESS -> PARSING -> "
        "DOCUMENTS_REQUESTED -> COMPLETED / SUBMITTED) with automatic retry policies and soft/hard timeouts.\n\n"
        "- Enterprise Data Layer: Hosted on Azure SQL Server with ACID-compliant transactions and foreign-key cascading to "
        "guarantee zero orphaned database records."
    )
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 4.8, arch_text)
    pdf.ln(4)

    # --- Section 4: Security & Compliance ---
    if pdf.get_y() > 230:
        pdf.add_page()
    section_header("4. Security, Privacy & Regulatory Compliance")

    sec_items = [
        ("Zero-Trust Private AI", "100% cloud-isolated processing within customer or private cloud tenant. Patient data is NEVER used to train public commercial AI models."),
        ("Data Encryption", "TLS 1.3 encryption in transit for all APIs and portals. AES-256 bit encryption at rest for Azure SQL databases and blob document storage."),
        ("DPDP Act 2023 (India)", "Full alignment with India's Digital Personal Data Protection Act: user consent tracking, purpose limitation, and one-click data erasure rights."),
        ("IRDAI Compliance", "Full compliance with IRDAI reimbursement formats and Schedule I-IV non-payable expense classifications."),
        ("HIPAA Best Practices", "Automated log scrubbing masks Protected Health Information (PHI). Role-Based Access Controls (RBAC) restrict access."),
        ("Enterprise SSO & Audit", "Secured by Microsoft Entra ID (Azure AD) with MFA and JWT RS256. Immutable audit logs recorded in dbo.audit_logs.")
    ]

    for title, desc in sec_items:
        if pdf.get_y() > 268:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 8.8)
        pdf.set_fill_color(236, 253, 245)
        pdf.set_text_color(6, 78, 59)
        pdf.cell(50, 6, f"  {title}", border="LBT", fill=True)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 65, 85)
        pdf.multi_cell(130, 4.5, desc, border="RBT")
        pdf.ln(1.5)

    pdf.ln(3)

    # --- Section 5: ROI Comparison Table ---
    if pdf.get_y() > 230:
        pdf.add_page()
    section_header("5. Enterprise Business Value & ROI")

    headers = [("Metric / Dimension", 45), ("Manual Process", 45), ("Generic Portals", 45), ("ClaimsGuru AI", 45)]
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_fill_color(15, 23, 42)
    pdf.set_text_color(255, 255, 255)
    for h, w in headers:
        pdf.cell(w, 7, f" {h}", border=1, fill=True)
    pdf.ln()

    rows = [
        ("Claim Prep Time", "2 to 4 days (paper)", "45-60 min / claim", "Under 3 minutes"),
        ("Rejection Rate", "15% - 22% (common errors)", "10% - 14%", "Under 3% (fail-fast gate)"),
        ("Deduction Transparency", "Zero upfront visibility", "Basic text list", "Itemized IRDAI tagging"),
        ("Insurer Reach", "Single insurer mail-in", "Single insurer locked", "Universal (Any TPA)"),
        ("Data Security", "Paper / Unencrypted PDF", "Vendor proprietary DB", "Private AI + AES-256")
    ]

    for r in rows:
        if pdf.get_y() > 270:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(45, 6, f" {r[0]}", border=1)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(45, 6, f" {r[1]}", border=1)
        pdf.cell(45, 6, f" {r[2]}", border=1)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(14, 116, 144)
        pdf.cell(45, 6, f" {r[3]}", border=1)
        pdf.ln()

    # Footer note
    pdf.ln(5)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, "Contact WaferWire Cloud Technologies (WCT) for enterprise evaluation and API integration specs.", align="C")

    pdf.output(output_path)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    out_dir = r"C:\Users\Admin\Downloads"
    out_file = os.path.join(out_dir, "ClaimsGuru_Enterprise_Capabilities_and_Security_Brief.pdf")
    create_brief_pdf(out_file)
