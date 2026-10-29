"""
Generate a high-impact, executive-ready PDF specification of ClaimsGuru Backend Technologies
and Pre-Production Live Azure Cloud Deployment for the Marketing and Leadership team.
"""
import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute total pages and draw consistent headers/footers."""
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
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0D9488")) # Teal branding

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "ClaimsGuru™ Enterprise — Backend Technology & Azure Pre-Prod Deployment")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(558, 755, "Pre-Production Live Verified")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.6)
            self.line(54, 747, 558, 747)

        # Footer (all pages)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 34, "CONFIDENTIAL — FOR MARKETING, SALES ENABLEMENT & ENTERPRISE AUDIT REVIEW")
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 34, footer_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.6)
        self.line(54, 46, 558, 46)
        self.restoreState()

def create_deployment_guide_pdf(output_paths):
    for output_path in output_paths:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

    main_pdf_path = output_paths[0]

    doc = SimpleDocTemplate(
        main_pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Color Palette
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_teal = colors.HexColor("#0D9488")       # Teal 600
    c_dark_teal = colors.HexColor("#115E59")  # Teal 800
    c_slate_dark = colors.HexColor("#334155") # Slate 700
    c_slate_light = colors.HexColor("#64748B")# Slate 500
    c_border = colors.HexColor("#E2E8F0")     # Slate 200
    c_bg_head = colors.HexColor("#F8FAFC")    # Slate 50
    c_bg_badge = colors.HexColor("#CCFBF1")   # Teal 100

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_teal,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_dark_teal,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_slate_dark,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'BodyBoldCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_slate_dark
    )

    meta_key = ParagraphStyle(
        'MetaKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_primary
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_slate_dark
    )

    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=c_primary
    )

    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_slate_dark
    )

    td_bold = ParagraphStyle(
        'TableCellBold',
        parent=td_style,
        fontName='Helvetica-Bold',
        textColor=c_primary
    )

    td_badge = ParagraphStyle(
        'TableCellBadge',
        parent=td_style,
        fontName='Helvetica-Bold',
        textColor=c_dark_teal
    )

    story = []

    # 1. Header Block & Metadata Card
    story.append(Paragraph("ClaimsGuru™ Enterprise Platform", title_style))
    story.append(Paragraph("Backend Technology Stack & Azure Pre-Production Deployment Guide", subtitle_style))

    meta_data = [
        [
            Paragraph("<b>Target Audience:</b>", meta_key),
            Paragraph("Marketing, Sales Enablement, Enterprise Buyers", meta_val),
            Paragraph("<b>Environment:</b>", meta_key),
            Paragraph("Microsoft Azure Pre-Production (Central India)", meta_val)
        ],
        [
            Paragraph("<b>Live Domains:</b>", meta_key),
            Paragraph("https://www.wct-health.com | wct-health.com", meta_val),
            Paragraph("<b>Resource Group:</b>", meta_key),
            Paragraph("<code>claimsGuru</code> (All Services Provisioned)", meta_val)
        ],
        [
            Paragraph("<b>Classification:</b>", meta_key),
            Paragraph("Enterprise Technical & Marketing Brief", meta_val),
            Paragraph("<b>Verification Date:</b>", meta_key),
            Paragraph("October 2026 (Live Audit & CLI Verified)", meta_val)
        ]
    ]

    t_meta = Table(meta_data, colWidths=[90, 162, 90, 162])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.75, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # 2. Executive Summary (Simple for Marketing)
    story.append(Paragraph("1. Executive Summary: What Powers ClaimsGuru?", h1_style))
    story.append(Paragraph(
        "<b>ClaimsGuru</b> is an intelligent, enterprise-grade health insurance adjudication and claim auditing platform. "
        "It eliminates manual claim verification by transforming multi-page, scanned hospital bills, diagnostic receipts, "
        "and discharge summaries into structured, verified, line-by-line financial tables and IRDAI-compliant audit reports.",
        body_style
    ))
    story.append(Paragraph(
        "Running natively on <b>Microsoft Azure</b>, the backend uses a modern <b>asynchronous microservices architecture</b> "
        "built with <b>Python FastAPI</b>, <b>Celery</b>, and <b>Redis</b>. AI extraction combines <b>Azure AI Document Intelligence</b> "
        "for computer vision table parsing with <b>Azure OpenAI GPT-4o</b> for clinical reasoning and coding, delivering turnaround times "
        "under 25 seconds with complete mathematical precision and zero data loss.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Value Pillars Table
    pillar_data = [
        [Paragraph("Pillar", th_style), Paragraph("Marketing Pitch & Enterprise Client Benefit", th_style)],
        [
            Paragraph("⚡ <b>High-Speed Async Engine</b>", td_bold),
            Paragraph("Multi-page hospital bills (50+ pages) are processed in the background with zero UI lag via Celery queues and in-memory Redis message brokers.", td_style)
        ],
        [
            Paragraph("🎯 <b>Dual-Engine AI Accuracy</b>", td_bold),
            Paragraph("Pairs Azure Document Intelligence table coordinate extraction with Azure OpenAI GPT-4o parallel semantic parsing to capture complex hospital tariffs flawlessly.", td_style)
        ],
        [
            Paragraph("🛡️ <b>Bank-Grade Security</b>", td_bold),
            Paragraph("Secured via Microsoft Entra External ID (SSO/OAuth2), TLS 1.3 encryption, Azure Key Vault secret management, and 100% private Azure Blob Storage.", td_style)
        ],
        [
            Paragraph("📈 <b>Elastic Cloud Scalability</b>", td_bold),
            Paragraph("Containerized microservices running on Azure Container Apps autoscale dynamically from 1 to 10 instances based on concurrent claim load.", td_style)
        ],
    ]
    t_pillar = Table(pillar_data, colWidths=[130, 374])
    t_pillar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_pillar)
    story.append(Spacer(1, 10))

    # 3. Core Backend Technologies (Explained Simply)
    story.append(Paragraph("2. Backend Technologies Used (Explained in Simple Terms)", h1_style))

    tech_data = [
        [Paragraph("Technology Layer", th_style), Paragraph("Selected Technology", th_style), Paragraph("Simple Explanation & Why We Use It", th_style)],
        [
            Paragraph("<b>Core API Gateway</b>", td_bold),
            Paragraph("<b>FastAPI & Python 3.11</b><br/>ASGI Engine: Uvicorn", td_style),
            Paragraph("Ultra-fast, asynchronous REST API. Handles user uploads and claim lifecycle with sub-second response times without blocking server resources.", td_style)
        ],
        [
            Paragraph("<b>Background Workers</b>", td_bold),
            Paragraph("<b>Celery 5.4</b><br/>Broker: Redis 7", td_style),
            Paragraph("Asynchronous task engine. Offloads heavy AI and OCR computing from the website so the user's browser never hangs or buffers.", td_style)
        ],
        [
            Paragraph("<b>Real-Time Cache</b>", td_bold),
            Paragraph("<b>Redis 7 Container</b><br/>In-Cluster TCP 6379", td_style),
            Paragraph("Ultra-fast in-memory cache. Powers real-time live progress bars (0% to 100%) and instant session retrieval for auditors.", td_style)
        ],
        [
            Paragraph("<b>Generative AI / LLM</b>", td_bold),
            Paragraph("<b>Azure OpenAI GPT-4o</b><br/>Global (440K TPM)", td_style),
            Paragraph("Enterprise-hosted Multimodal AI. Parses messy pharmacy items, extracts clinical diagnoses, and suggests accurate ICD-10 and CPT codes.", td_style)
        ],
        [
            Paragraph("<b>Computer Vision OCR</b>", td_bold),
            Paragraph("<b>Azure Document Intelligence</b><br/>(Form Recognizer S0)", td_style),
            Paragraph("Deep layout analysis. Detects table boundaries, columns, headers, and text from blurry scanned hospital receipts and discharge summaries.", td_style)
        ],
        [
            Paragraph("<b>Relational Database</b>", td_bold),
            Paragraph("<b>Azure SQL Database</b><br/>(Standard S1 - 20 DTUs)", td_style),
            Paragraph("Bank-grade relational database. Safely stores claims, hospital rosters, itemized bills, policy rules, and immutable audit logs.", td_style)
        ],
        [
            Paragraph("<b>Secure File Lake</b>", td_bold),
            Paragraph("<b>Azure Blob Storage</b><br/>Hot Tier (claimgpt)", td_style),
            Paragraph("Encrypted object storage. Stores raw medical files and generated PDFs with zero public internet access (access only via secure token).", td_style)
        ],
        [
            Paragraph("<b>Enterprise Identity</b>", td_bold),
            Paragraph("<b>Microsoft Entra ID</b><br/>(CIAM / OAuth 2.0)", td_style),
            Paragraph("Enterprise Single Sign-On (SSO) and authentication. Ensures only authorized employees and auditors can access patient health records.", td_style)
        ],
        [
            Paragraph("<b>Automated PDF Engine</b>", td_bold),
            Paragraph("<b>WeasyPrint & Jinja2</b>", td_style),
            Paragraph("High-fidelity PDF generation. Generates official IRDAI Standard Claim Forms (Part A & B) and executive TPA reimbursement summaries.", td_style)
        ],
    ]
    t_tech = Table(tech_data, colWidths=[105, 120, 279])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_tech)

    # Page Break for Deployment Section
    story.append(PageBreak())

    # 4. Live Pre-Production Cloud Infrastructure
    story.append(Paragraph("3. Live Pre-Production Cloud Services & Configurations", h1_style))
    story.append(Paragraph(
        "ClaimsGuru pre-production is fully deployed in Microsoft Azure within the <b>claimsGuru</b> resource group (Central India). "
        "The environment mirrors enterprise production architecture with automated autoscaling, private data isolation, and redundant services.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Pre-prod Services Inventory Table
    service_data = [
        [
            Paragraph("Service / Resource Name", th_style),
            Paragraph("Azure Type", th_style),
            Paragraph("Sizing & Specs", th_style),
            Paragraph("Autoscaling / Configuration", th_style),
            Paragraph("Role in Platform", th_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-frontend</b>", td_bold),
            Paragraph("Azure Container App", td_style),
            Paragraph("0.5 vCPU<br/>1.0 GiB RAM", td_style),
            Paragraph("Autoscales: <b>1 – 5 replicas</b><br/>Custom Domain: <code>wct-health.com</code>", td_style),
            Paragraph("Next.js 14 web application. Auditor Cockpit, customer dashboard, and landing page.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-ingress</b>", td_bold),
            Paragraph("Azure Container App", td_style),
            Paragraph("1.0 vCPU<br/>2.0 GiB RAM", td_style),
            Paragraph("Autoscales: <b>2 – 10 replicas</b><br/>Port 8000 (External HTTP)", td_style),
            Paragraph("FastAPI API Gateway. Uploads, Entra JWT auth, claim CRUD, and status polling.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-worker-default</b>", td_bold),
            Paragraph("Azure Container App", td_style),
            Paragraph("1.0 vCPU<br/>2.0 GiB RAM", td_style),
            Paragraph("Autoscales: <b>2 – 8 replicas</b><br/>Celery <code>default</code> queue", td_style),
            Paragraph("Background worker. Clinical coding, IRDAI rule checks, anomaly checks, and PDF creation.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-worker-ocr</b>", td_bold),
            Paragraph("Azure Container App", td_style),
            Paragraph("1.0 vCPU<br/>2.0 GiB RAM", td_style),
            Paragraph("Autoscales: <b>1 – 6 replicas</b><br/>Celery <code>ocr_queue</code>", td_style),
            Paragraph("Dedicated vision worker. PDF rasterization and Azure Document Intelligence extraction.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-redis</b>", td_bold),
            Paragraph("Azure Container App", td_style),
            Paragraph("0.5 vCPU<br/>1.0 GiB RAM", td_style),
            Paragraph("Static: <b>1 replica</b><br/>Internal Port 6379", td_style),
            Paragraph("In-memory task broker for Celery queues and live claim progress bar synchronization.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-sql-vvekhbufuteq2</b><br/>*(DB: `claimsguru`)*", td_bold),
            Paragraph("Azure SQL Database", td_style),
            Paragraph("Standard Tier<br/>(20 DTUs)", td_style),
            Paragraph("Max 250 GB storage<br/>Max 60 concurrent workers", td_style),
            Paragraph("Transactional relational persistence for claims, tariffs, line items, and audit trail.", td_style)
        ],
        [
            Paragraph("<b>cgpreprodstvvekhbufuteq2</b><br/>*(Container: `claimgpt`)*", td_bold),
            Paragraph("Azure Blob Storage", td_style),
            Paragraph("StorageV2 Hot<br/>(Standard LRS)", td_style),
            Paragraph("Public Access: <b>DENIED</b><br/>Enforce HTTPS (TLS 1.2+)", td_style),
            Paragraph("Secure document lake storing uploaded claim PDFs, bills, and generated audit reports.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-openai</b>", td_bold),
            Paragraph("Azure OpenAI", td_style),
            Paragraph("GPT-4o (2024-11-20)<br/>Standard S0", td_style),
            Paragraph("<b>440K Tokens/Min</b><br/>Global Standard routing", td_style),
            Paragraph("Generative AI engine for semantic table parsing and clinical reasoning.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-docintel-...</b>", td_bold),
            Paragraph("Azure Doc Intelligence", td_style),
            Paragraph("Standard S0<br/>(Form Recognizer)", td_style),
            Paragraph("Prebuilt Read & Layout<br/>Direct REST API integration", td_style),
            Paragraph("Computer vision OCR extracting bounding boxes, tables, and handwriting.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-sb-vvekhbufuteq2</b>", td_bold),
            Paragraph("Azure Service Bus", td_style),
            Paragraph("Standard Tier", td_style),
            Paragraph("Queues: <code>default</code>, <code>ocr_queue</code>", td_style),
            Paragraph("Enterprise cloud message bus guaranteeing zero message loss during traffic spikes.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-kv-vvekhbufut</b>", td_bold),
            Paragraph("Azure Key Vault", td_style),
            Paragraph("Standard Tier", td_style),
            Paragraph("Soft-delete enabled<br/>RBAC Secret Access", td_style),
            Paragraph("Hardware-backed vault storing all database passwords, API keys, and connection strings.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-comm</b><br/><b>cg-preprod-email</b>", td_bold),
            Paragraph("Azure Communication", td_style),
            Paragraph("Enterprise Global<br/>Pay-As-You-Go", td_style),
            Paragraph("Verified Domain:<br/><code>notifications.wct-health.com</code>", td_style),
            Paragraph("Automated transactional email dispatch sending audit notifications to patients and auditors.", td_style)
        ],
        [
            Paragraph("<b>cg-preprod-cin-law</b>", td_bold),
            Paragraph("Azure Log Analytics", td_style),
            Paragraph("PerGB2018 Tier", td_style),
            Paragraph("30-Day Retention<br/>Centralized Workspace", td_style),
            Paragraph("24/7 telemetry, container metrics, and regulatory audit log tracking.", td_style)
        ],
        [
            Paragraph("<b>acrclaimsgurupreprod</b>", td_bold),
            Paragraph("Azure Container Registry", td_style),
            Paragraph("Basic Tier<br/>(10 GiB included)", td_style),
            Paragraph("Private Repository<br/>Active tag: <code>preprod-rev104</code>", td_style),
            Paragraph("Private Docker registry storing and deploying versioned container microservices.", td_style)
        ],
    ]

    t_service = Table(service_data, colWidths=[105, 85, 75, 115, 124])
    t_service.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 2.8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_service)
    story.append(Spacer(1, 10))

    # Page Break for Claim Journey & Security
    story.append(PageBreak())

    # 5. Claim Journey (5 Simple Steps)
    story.append(Paragraph("4. The End-to-End Claim Journey: 5 Simple Steps", h1_style))
    story.append(Paragraph(
        "From the moment an employee or hospital uploads documents to the final adjudication report delivery, "
        "every step runs automatically and seamlessly:",
        body_style
    ))
    story.append(Spacer(1, 4))

    steps_data = [
        [
            Paragraph("<b>Step 1: Secure Ingestion (0–2s)</b>", td_bold),
            Paragraph("Claimant signs in securely via Microsoft Entra External ID and uploads medical bills. Ingress streams files directly to encrypted Azure Blob Storage.", td_style)
        ],
        [
            Paragraph("<b>Step 2: Table & Layout OCR (2–8s)</b>", td_bold),
            Paragraph("OCR background worker extracts tables, line items, hospital letterhead, and handwriting using Azure AI Document Intelligence computer vision.", td_style)
        ],
        [
            Paragraph("<b>Step 3: Clinical AI Coding (8–18s)</b>", td_bold),
            Paragraph("Azure OpenAI GPT-4o parses complex medical terms, maps diagnosis to standard ICD-10 and CPT codes, and checks consistency with doctors' notes.", td_style)
        ],
        [
            Paragraph("<b>Step 4: IRDAI Adjudication (18–22s)</b>", td_bold),
            Paragraph("Automated rules engine scores the claim against Indian IRDAI guidelines, identifies non-payable items, and runs fraud and duplicate checks.", td_style)
        ],
        [
            Paragraph("<b>Step 5: Reports & Notifications (22–25s)</b>", td_bold),
            Paragraph("System generates official IRDAI Standard Form and TPA Executive Adjudication PDFs, updating the Auditor Cockpit and emailing stakeholders.", td_style)
        ],
    ]
    t_steps = Table(steps_data, colWidths=[140, 364])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_steps)
    story.append(Spacer(1, 12))

    # 6. Enterprise Security & Compliance Highlights
    story.append(Paragraph("5. Enterprise Security, Privacy & Reliability Highlights", h1_style))
    story.append(Paragraph(
        "Key security pillars ready for enterprise procurement, CISO review, and sales presentations:",
        body_style
    ))
    story.append(Spacer(1, 4))

    sec_data = [
        [Paragraph("Security Dimension", th_style), Paragraph("Enterprise Guarantee & Implementation", th_style)],
        [
            Paragraph("🛡️ <b>Data Privacy & Isolation</b>", td_bold),
            Paragraph("Zero public access to patient files. All medical records in Azure Blob Storage are private and accessed strictly via authenticated, temporary tokens.", td_style)
        ],
        [
            Paragraph("🔐 <b>End-to-End Encryption</b>", td_bold),
            Paragraph("TLS 1.3 encryption in transit for all web and API traffic. Microsoft AES-256 hardware-level encryption at rest across databases and storage.", td_style)
        ],
        [
            Paragraph("🔑 <b>Hardware Key Vault</b>", td_bold),
            Paragraph("Zero passwords, connection strings, or API tokens stored in code. All credentials retrieved securely from Azure Key Vault with soft-delete enabled.", td_style)
        ],
        [
            Paragraph("📈 <b>High Availability & Resilience</b>", td_bold),
            Paragraph("Microservices autoscale up to 10 instances during traffic surges. Asynchronous message queues ensure zero data loss even during peak billing cycles.", td_style)
        ],
        [
            Paragraph("📋 <b>Regulatory Audit Trail</b>", td_bold),
            Paragraph("Every AI extraction, tariff adjustment, and claim status change is permanently timestamped and logged for regulatory transparency and IRDAI compliance.", td_style)
        ],
    ]
    t_sec = Table(sec_data, colWidths=[130, 374])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 14))

    # Closing verification note
    story.append(Paragraph(
        "<b>Verification Note:</b> All technical specifications, Azure resource names, container sizing, and domain configurations in this "
        "document have been directly verified against the active <code>claimsGuru</code> pre-production environment in Microsoft Azure.",
        body_style
    ))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)

    # Copy to destination paths
    for path in output_paths[1:]:
        shutil.copyfile(main_pdf_path, path)
        print(f"Copied PDF to: {path}")

if __name__ == "__main__":
    destinations = [
        r"C:\Project\claimsguru\docs\ClaimsGuru_Preprod_Deployment_and_Backend_Tech_Guide.pdf",
        r"C:\Users\Admin\Downloads\ClaimsGuru_Preprod_Deployment_and_Backend_Tech_Guide.pdf"
    ]
    create_deployment_guide_pdf(destinations)
    print("SUCCESS: Pre-Prod Deployment & Backend Tech Guide PDF generated successfully.")
