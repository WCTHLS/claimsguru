"""
Generate a complete, publication-grade Product, Architecture & Onboarding Guide for ClaimsGuru.
Designed for new joiners, engineering, product, QA, and enterprise stakeholders.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Segoe UI TrueType fonts for crisp typography and full Unicode punctuation support
pdfmetrics.registerFont(TTFont('SegoeUI', r'C:\Windows\Fonts\segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeUI-Bold', r'C:\Windows\Fonts\segoeuib.ttf'))
pdfmetrics.registerFont(TTFont('SegoeUI-Italic', r'C:\Windows\Fonts\segoeuii.ttf'))
pdfmetrics.registerFont(TTFont('SegoeUI-BoldItalic', r'C:\Windows\Fonts\segoeuiz.ttf'))

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute total pages and draw headers/footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("SegoeUI-Bold", 8)
        self.setFillColor(colors.HexColor("#0F766E")) # Teal 700
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(45, 755, "ClaimsGuru | Complete Product, Architecture & Onboarding Guide")
            self.setFont("SegoeUI", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(567, 755, "WaferWire Cloud Technologies")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(45, 747, 567, 747)
            
        # Footer (all pages)
        self.setFont("SegoeUI", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(45, 28, "ClaimsGuru Platform Architecture Guide | WaferWire Cloud Technologies")
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(567, 28, footer_text)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(45, 38, 567, 38)
        self.restoreState()

def create_guide_pdf(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 612 x 792 pt letter size, 45pt margins -> printable width = 522 pt
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=42,
        bottomMargin=42
    )
    
    styles = getSampleStyleSheet()
    
    # Brand colors
    c_slate_900 = colors.HexColor("#0F172A")
    c_teal_700  = colors.HexColor("#0F766E")
    c_teal_800  = colors.HexColor("#115E59")
    c_slate_600 = colors.HexColor("#475569")
    c_slate_100 = colors.HexColor("#F8FAFC")
    c_border    = colors.HexColor("#CBD5E1")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=18,
        leading=22,
        textColor=c_slate_900,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=10.5,
        leading=14.5,
        textColor=c_teal_700,
        spaceAfter=8
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=8.5,
        leading=12,
        textColor=c_slate_600
    )
    
    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=11.5,
        leading=15,
        textColor=c_slate_900,
        spaceBefore=8,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=9.0,
        leading=12.8,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=8.5,
        leading=11.6,
        textColor=colors.HexColor("#1E293B")
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=8.8,
        leading=12.0,
        textColor=c_slate_900
    )
    
    table_cell_head = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=8.8,
        leading=12.0,
        textColor=colors.white
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#0F172A")
    )

    story = []
    
    # ---------------------------------------------------------
    # PAGE 1: TITLE, OVERVIEW, PROBLEM, MULTILINGUAL SUMMARY
    # ---------------------------------------------------------
    story.append(Paragraph("ClaimsGuru | Enterprise Health Reimbursement Platform", title_style))
    story.append(Paragraph("Complete Product, Architecture & Onboarding Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_teal_700, spaceAfter=10))

    # SECTION 1
    story.append(Paragraph("1. Executive Overview: What is ClaimsGuru?", h1_style))
    story.append(Paragraph(
        "<b>ClaimsGuru</b> is an enterprise-grade, AI-powered health insurance claim intake, audit, and adjudication platform "
        "engineered by <b>WaferWire Cloud Technologies (WCT)</b>. Operating natively on Microsoft Azure, ClaimsGuru bridges "
        "patients, healthcare providers (hospitals), and insurance Third-Party Administrators (TPAs) into a unified, high-speed ecosystem.<br/>"
        "Historically, health insurance reimbursement in India has required policyholders to mail stacks of physical paper bills, wait weeks for manual "
        "keypunching, and endure high technical rejection rates. ClaimsGuru ingests messy, scanned, multi-page hospital invoices, handwritten discharge "
        "summaries, and pharmacy receipts, and autonomously transforms them into structured, verified, and audited insurance dossiers in <b>under 3 minutes</b>.",
        body_style
    ))
    story.append(Spacer(1, 5))

    # SECTION 2
    story.append(Paragraph("2. The Problem in the Indian Health Insurance Ecosystem", h1_style))
    prob_data = [
        [Paragraph("Industry Pain Point", table_cell_head), Paragraph("Real-World Impact on Patients & Insurers", table_cell_head), Paragraph("ClaimsGuru Autonomous Fix", table_cell_head)],
        [
            Paragraph("<b>15 to 30 Day Delays</b>", table_cell_bold),
            Paragraph("Physical bill courier, manual data entry, and postal back-and-forth stall reimbursements for weeks.", table_cell),
            Paragraph("Instant digital intake & OCR reduces processing cycle to <b>under 3 minutes</b>.", table_cell)
        ],
        [
            Paragraph("<b>>18% Technical Rejections</b>", table_cell_bold),
            Paragraph("Claims rejected due to patient typos, missing invoices, or mixing family member records.", table_cell),
            Paragraph("<b>Fail-Fast Identity Consensus Gate</b> validates & rejects mismatched papers pre-submission.", table_cell)
        ],
        [
            Paragraph("<b>Surprise Tariff Cuts</b>", table_cell_bold),
            Paragraph("Hospitals bundle hundreds of non-payable consumables; patients face unexpected cuts.", table_cell),
            Paragraph("Automated <b>IRDAI Schedule I–IV engine</b> itemizes approved vs. deducted amounts upfront.", table_cell)
        ],
        [
            Paragraph("<b>Policy Clause Complexity</b>", table_cell_bold),
            Paragraph("Complex rules: 1% Room Rent caps, co-payments, and Pre-Existing Disease (PED) waiting periods.", table_cell),
            Paragraph("Autonomous <b>Policy Schedule Engine</b> cross-audits bills directly against plan limits.", table_cell)
        ]
    ]
    t_prob = Table(prob_data, colWidths=[120, 212, 190])
    t_prob.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_slate_900),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_prob)
    story.append(Spacer(1, 6))

    # SECTION 3
    story.append(Paragraph("3. Multilingual Accessibility: 14 Indian Languages & Bi-directional RTL", h1_style))
    story.append(Paragraph(
        "To empower policyholders across all Indian states and vernacular regions, ClaimsGuru provides complete native localization "
        "across <b>14 constitutionally recognized languages</b> without reliance on real-time external machine translation:",
        body_style
    ))
    story.append(Spacer(1, 3))

    lang_highlights = [
        [Paragraph("Multilingual Capability", table_cell_head), Paragraph("Enterprise Technical Implementation & Regional Coverage", table_cell_head)],
        [
            Paragraph("<b>14 Native Languages</b>", table_cell_bold),
            Paragraph("Complete UI coverage: English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, and Sanskrit rendered in native regional scripts.", table_cell)
        ],
        [
            Paragraph("<b>Urdu RTL Support</b>", table_cell_bold),
            Paragraph("Automatic bi-directional text flow and layout switching (<code>dir='rtl'</code>) for seamless Urdu reading and form completion.", table_cell)
        ],
        [
            Paragraph("<b>Persistent Preference</b>", table_cell_bold),
            Paragraph("User language selection is saved across sessions in <code>localStorage</code> (<code>claimsguru_lang</code>) and synchronized to the HTML root element.", table_cell)
        ],
        [
            Paragraph("<b>WCAG AA Accessibility</b>", table_cell_bold),
            Paragraph("Guaranteed high-contrast compliance (contrast ratio &ge; 4.5:1) across all script systems with 44&times;44px touch targets on mobile and desktop.", table_cell)
        ]
    ]
    t_lang_high = Table(lang_highlights, colWidths=[130, 392])
    t_lang_high.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_teal_800),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_lang_high)

    # ---------------------------------------------------------
    # PAGE BREAK -> PAGE 2: 10-STAGE PIPELINE & SECURITY
    # ---------------------------------------------------------
    story.append(PageBreak())

    # SECTION 4: THE 10-STAGE PIPELINE
    story.append(Paragraph("4. How ClaimsGuru Works: The 10-Stage Autonomous Pipeline", h1_style))
    story.append(Paragraph(
        "Every incoming insurance submission is processed through an automated, asynchronous ten-stage clinical pipeline:",
        body_style
    ))
    story.append(Spacer(1, 3))

    pipeline_data = [
        [Paragraph("Pipeline Stage", table_cell_head), Paragraph("Technical Workflow & Autonomous Capabilities", table_cell_head)],
        [
            Paragraph("<b>1. Multi-Format Intake</b>", table_cell_bold),
            Paragraph("Ingests single/multi-page PDFs, JPEG, PNG, and camera photos up to 25 MB. Computes a set-based SHA-256 fingerprint to immediately block duplicate submissions.", table_cell)
        ],
        [
            Paragraph("<b>2. Identity Gate</b>", table_cell_bold),
            Paragraph("Cross-checks patient name, age, and gender across all documents. Automatically isolates and rejects mismatched family member or third-party files before processing.", table_cell)
        ],
        [
            Paragraph("<b>3. Vision & Table OCR</b>", table_cell_bold),
            Paragraph("Combines Azure AI Document Intelligence with custom vision heuristics to parse complex multi-page hospital invoices with hundreds of line items and taxes.", table_cell)
        ],
        [
            Paragraph("<b>4. Clinical NER & Codes</b>", table_cell_bold),
            Paragraph("Extracts diagnoses and surgical procedures via Biomedical LLMs and FAISS vector indices, automatically mapping them to official ICD-10-CM and CPT codes.", table_cell)
        ],
        [
            Paragraph("<b>5. Policy Plan Engine</b>", table_cell_bold),
            Paragraph("Extracts Sum Insured (SI), Room Rent Limits, Co-Payment Clauses, PED waiting periods, and specific surgical sub-limits (maternity, cataract, AYUSH).", table_cell)
        ],
        [
            Paragraph("<b>6. Policy Cross-Audit</b>", table_cell_bold),
            Paragraph("Compares hospital billing categories against policy limits. Calculates proportional room rent deductions and separates non-payable consumables under IRDAI guidelines.", table_cell)
        ],
        [
            Paragraph("<b>7. 11 IRDAI Rules & Risk</b>", table_cell_bold),
            Paragraph("Evaluates the claim against 11 mandatory IRDAI validation rules and executes XGBoost/LightGBM risk models to predict approval odds and flag rejection triggers.", table_cell)
        ],
        [
            Paragraph("<b>8. AcroForms & Dossier</b>", table_cell_bold),
            Paragraph("Auto-populates fillable IRDAI Claim Form (Part A & Part B) PDF AcroForms with digital touchscreen signature pads and downloadable clinical audit dossiers.", table_cell)
        ],
        [
            Paragraph("<b>9. Missing Policy Flow</b>", table_cell_bold),
            Paragraph("Allows patients to upload a missing policy schedule later ('Update Policy Doc'), seamlessly recalculating coverage limits without needing to re-upload hospital bills.", table_cell)
        ],
        [
            Paragraph("<b>10. TPA Review Portal</b>", table_cell_bold),
            Paragraph("Provides hospital and TPA adjusters with review consoles (/[orgSlug]/review) to approve, reject, or request specific additional records (DOCUMENTS_REQUESTED).", table_cell)
        ]
    ]
    t_pipe = Table(pipeline_data, colWidths=[130, 392])
    t_pipe.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_teal_800),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_pipe)
    story.append(Spacer(1, 6))

    # SECTION 5: SECURITY
    story.append(Paragraph("5. Security, Privacy & Zero Egress Architecture", h1_style))
    sec_data = [
        [Paragraph("Security Pillar", table_cell_head), Paragraph("Technical Control & Architecture Implementation", table_cell_head), Paragraph("Regulatory Standard", table_cell_head)],
        [
            Paragraph("<b>Zero Public AI Egress</b>", table_cell_bold),
            Paragraph("Patient Health Information (PHI) and PII are processed strictly within isolated Azure tenant boundaries. No customer data is ever shared with or used to train commercial public AI models.", table_cell),
            Paragraph("HIPAA & Enterprise BAA", table_cell)
        ],
        [
            Paragraph("<b>DPDP Act, 2023 Compliance</b>", table_cell_bold),
            Paragraph("Explicit digital consent verification, data minimization, automated retention schedules, and one-click right to personal data erasure.", table_cell),
            Paragraph("DPDP Act, India 2023", table_cell)
        ],
        [
            Paragraph("<b>Bank-Grade Cryptography</b>", table_cell_bold),
            Paragraph("End-to-end TLS 1.3 in transit; AES-256 bit Transparent Data Encryption (TDE) at rest across all databases and Azure Blob storage containers.", table_cell),
            Paragraph("SOC 2 Type II / ISO 27001", table_cell)
        ],
        [
            Paragraph("<b>Immutable Audit Logging</b>", table_cell_bold),
            Paragraph("All claim events, identity gate evaluations, reviewer overrides, and document modifications are permanently recorded in <code>dbo.audit_logs</code> with UTC timestamps.", table_cell),
            Paragraph("IRDAI Audit Compliance", table_cell)
        ]
    ]
    t_sec = Table(sec_data, colWidths=[115, 297, 110])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_slate_900),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_sec)

    # ---------------------------------------------------------
    # PAGE BREAK -> PAGE 3: TECH STACK & GLOSSARY
    # ---------------------------------------------------------
    story.append(PageBreak())

    # SECTION 6: TECH STACK
    story.append(Paragraph("6. Complete Technical Stack Specification", h1_style))
    story.append(Paragraph(
        "ClaimsGuru is architected as a modern, high-throughput microservices ecosystem on Microsoft Azure:",
        body_style
    ))
    story.append(Spacer(1, 3))

    tech_data = [
        [Paragraph("Architecture Layer", table_cell_head), Paragraph("Technology & Version", table_cell_head), Paragraph("Role & Architectural Responsibility", table_cell_head)],
        [
            Paragraph("<b>Frontend Portal</b>", table_cell_bold),
            Paragraph("Next.js 14, React 18/19, Tailwind CSS, Lucide Icons", table_cell),
            Paragraph("WCAG AA accessible self-service portal, TPA adjudication consoles, responsive from 375px mobile to 1366x768 desktop.", table_cell)
        ],
        [
            Paragraph("<b>API Gateway</b>", table_cell_bold),
            Paragraph("Python 3.11, FastAPI (v0.128.8), Uvicorn uvloop", table_cell),
            Paragraph("High-throughput asynchronous REST gateway handling claim lifecycle, document uploads, and real-time state polling.", table_cell)
        ],
        [
            Paragraph("<b>Async Workers</b>", table_cell_bold),
            Paragraph("Celery (v5.4.0), Azure Cache for Redis, Azure Service Bus", table_cell),
            Paragraph("Isolated queues (ocr_queue, parser_queue, default_queue) ensuring compute-heavy OCR never blocks API traffic.", table_cell)
        ],
        [
            Paragraph("<b>Relational DB</b>", table_cell_bold),
            Paragraph("Azure SQL Database (MS SQL Server), SQLAlchemy 2.0, Alembic", table_cell),
            Paragraph("ACID-compliant relational persistence for claims, policy records, line items, and audit trails.", table_cell)
        ],
        [
            Paragraph("<b>Generative AI / LLM</b>", table_cell_bold),
            Paragraph("Azure OpenAI Service (GPT-4o, API 2024-11-20)", table_cell),
            Paragraph("Private, zero-egress LLM engine for clinical NER, medical term normalization, and policy contract analysis.", table_cell)
        ],
        [
            Paragraph("<b>Computer Vision OCR</b>", table_cell_bold),
            Paragraph("Azure AI Document Intelligence (Form Recognizer v3.3.0)", table_cell),
            Paragraph("Deep document layout analysis, bounding box extraction, and multi-page table detection for Indian hospital bills.", table_cell)
        ],
        [
            Paragraph("<b>Identity & Security</b>", table_cell_bold),
            Paragraph("Microsoft Entra External ID (CIAM), Azure Key Vault", table_cell),
            Paragraph("OAuth2 / OIDC Single Sign-On with RS256 JWT validation, hardware-backed HSM encryption, and DPDP/HIPAA compliance.", table_cell)
        ]
    ]
    t_tech = Table(tech_data, colWidths=[105, 155, 262])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_slate_900),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 3.2),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 6))

    # SECTION 7: GLOSSARY
    story.append(Paragraph("7. Essential Health Insurance Domain Glossary", h1_style))
    gloss_data = [
        [Paragraph("Insurance Term", table_cell_head), Paragraph("Definition & How It Applies in ClaimsGuru", table_cell_head)],
        [
            Paragraph("<b>TPA (Third-Party Administrator)</b>", table_cell_bold),
            Paragraph("Licensed entity managing claim adjudication between hospitals, insurers, and patients (e.g. Medi Assist, Vipul, Paramount, Vidal).", table_cell)
        ],
        [
            Paragraph("<b>IRDAI</b>", table_cell_bold),
            Paragraph("Insurance Regulatory & Development Authority of India. Sets statutory claim rules, Part A/B forms, and non-payable expense limits.", table_cell)
        ],
        [
            Paragraph("<b>Sum Insured (SI)</b>", table_cell_bold),
            Paragraph("The annual financial ceiling up to which the insurance company covers the patient's medical expenses.", table_cell)
        ],
        [
            Paragraph("<b>Room Rent Capping</b>", table_cell_bold),
            Paragraph("Clause capping daily room charges (e.g. 1% of SI). Upgrading to a costlier room triggers proportional deductions on doctor & OT fees.", table_cell)
        ],
        [
            Paragraph("<b>Co-Payment</b>", table_cell_bold),
            Paragraph("Mandatory cost-sharing (e.g. 10% or 20%) that the policyholder must pay from their own pocket before the insurer covers the rest.", table_cell)
        ],
        [
            Paragraph("<b>PED (Pre-Existing Disease)</b>", table_cell_bold),
            Paragraph("A medical ailment existing prior to policy issuance. Subject to a 24- to 48-month waiting period before claims become eligible.", table_cell)
        ],
        [
            Paragraph("<b>AcroForm</b>", table_cell_bold),
            Paragraph("Interactive form architecture embedded in PDFs that ClaimsGuru auto-populates for digital IRDAI Part A & B signing.", table_cell)
        ],
        [
            Paragraph("<b>ICD-10-CM & CPT</b>", table_cell_bold),
            Paragraph("International diagnostic (ICD-10) and surgical/procedural (CPT) medical coding standards mapped automatically by ClaimsGuru AI.", table_cell)
        ]
    ]
    t_gloss = Table(gloss_data, colWidths=[140, 382])
    t_gloss.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_teal_800),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_slate_100]),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_gloss)
    story.append(Spacer(1, 8))

    # Concluding Callout Box
    concl_box = [
        [
            Paragraph(
                "<b>Welcome to ClaimsGuru!</b> This platform represents a generational leap in health insurance technology. "
                "For technical specifications and API contracts, refer to <code>docs/architecture.md</code> and the interactive Swagger docs at <code>http://localhost:8000/docs</code>. "
                "For questions or architecture reviews, connect with the WaferWire Cloud Technologies engineering leads.",
                callout_text
            )
        ]
    ]
    t_concl = Table(concl_box, colWidths=[522])
    t_concl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#CCFBF1")), # Teal 100
        ('BOX', (0,0), (-1,-1), 1, c_teal_700),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_concl)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {output_path}")

if __name__ == "__main__":
    out_file = os.path.join(r"C:\Project\claimsguru\docs", "ClaimsGuru_Complete_Product_and_Architecture_Guide.pdf")
    create_guide_pdf(out_file)
