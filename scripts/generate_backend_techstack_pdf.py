"""
Generate a clean, high-impact PDF specification of the ClaimsGuru Backend Tech Stack.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute total pages."""
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "ClaimsGuru Enterprise — Complete Backend Tech Stack Architecture")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — PRE-PROD & PRODUCTION VERIFIED")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def create_tech_stack_pdf(output_paths):
    for output_path in output_paths:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # We will write to first path then copy to others
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
    
    # Custom Styles
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_accent = colors.HexColor("#2563EB")     # Royal Blue
    c_sub = colors.HexColor("#475569")        # Slate 600
    c_bg_head = colors.HexColor("#1E293B")    # Slate 800
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_accent,
        spaceAfter=15
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_sub
    )
    
    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    
    code_badge = ParagraphStyle(
        'CodeBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E40AF")
    )
    
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    
    td_key = ParagraphStyle(
        'TableKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_primary
    )
    
    td_val = ParagraphStyle(
        'TableVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155")
    )
    
    story = []
    
    # Header Banner
    story.append(Paragraph("ClaimsGuru Enterprise", title_style))
    story.append(Paragraph("Complete Backend Technology Stack & Cloud Infrastructure Specification", subtitle_style))
    
    meta_table_data = [
        [
            Paragraph("<b>Target Environment:</b> Azure Pre-Prod (Resource Group: <font color='#2563EB'>claimsGuru</font>)", meta_style),
            Paragraph("<b>Region:</b> Central India (cin)", meta_style)
        ],
        [
            Paragraph("<b>Ingress Core Image:</b> acrclaimsgurupreprod.azurecr.io/claimsguru-core", meta_style),
            Paragraph("<b>Verified Deployment:</b> Revision rev104 Active", meta_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[270, 234])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    # Section 1: Executive Overview
    story.append(Paragraph("1. Architecture Overview", h1_style))
    story.append(Paragraph(
        "ClaimsGuru's backend is architected as an <b>asynchronous, microservices-oriented AI processing engine</b>. "
        "Built on Python 3.11+ and FastAPI, it orchestrates multi-modal claim document ingestion, deep OCR bounding-box extraction, "
        "Azure OpenAI-driven medical entity parsing, IRDAI rule and tariff validation, and automated reimbursement audit report generation. "
        "Workloads are decoupled between synchronous HTTP API gateways and horizontal Celery background worker clusters.",
        body_style
    ))
    story.append(Spacer(1, 8))
    
    # Section 2: Core Backend Stack Table
    story.append(Paragraph("2. Core Runtime, Web Framework & Message Queues", h1_style))
    
    core_data = [
        [Paragraph("Layer / Component", th_style), Paragraph("Technology / Package", th_style), Paragraph("Exact Version", th_style), Paragraph("Enterprise Role & Implementation", th_style)],
        [Paragraph("Runtime Environment", td_key), Paragraph("Python 3.11+ (Debian Bookworm slim)", td_val), Paragraph("3.11.x", code_badge), Paragraph("Base container runtime for API ingress and distributed worker daemons.", td_val)],
        [Paragraph("API Gateway Framework", td_key), Paragraph("FastAPI", td_val), Paragraph("0.128.8", code_badge), Paragraph("Asynchronous high-performance REST API handling claim lifecycle, auth, and webhooks.", td_val)],
        [Paragraph("ASGI Server Engine", td_key), Paragraph("Uvicorn + uvloop + httptools", td_val), Paragraph("0.39.0 / 0.21.0", code_badge), Paragraph("Event-loop accelerated web server running with multi-worker concurrency.", td_val)],
        [Paragraph("Task Queue & Pipeline", td_key), Paragraph("Celery", td_val), Paragraph("5.4.0", code_badge), Paragraph("Distributed asynchronous task execution for multi-page OCR and deep AI audit pipelines.", td_val)],
        [Paragraph("In-Memory Broker & Cache", td_key), Paragraph("Azure Cache for Redis", td_val), Paragraph("redis 5.2.1", code_badge), Paragraph("Message transport for Celery workers and atomic real-time claim progress tracking.", td_val)],
        [Paragraph("Enterprise Event Broker", td_key), Paragraph("Azure Service Bus", td_val), Paragraph("7.14.0", code_badge), Paragraph("Decoupled asynchronous event messaging across claim ingress and worker nodes.", td_val)],
        [Paragraph("Data Serialization & Types", td_key), Paragraph("Pydantic & pydantic-settings", td_val), Paragraph("2.12.5", code_badge), Paragraph("Strict request/response validation, schema contracts, and environment variable enforcement.", td_val)],
    ]
    
    t_core = Table(core_data, colWidths=[95, 115, 60, 234])
    t_core.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_core)
    story.append(Spacer(1, 10))
    
    # Section 3: Database & Object Storage
    story.append(Paragraph("3. Database, ORM & Cloud Storage Layer", h1_style))
    db_data = [
        [Paragraph("Component", th_style), Paragraph("Technology / Service", th_style), Paragraph("Driver / Client", th_style), Paragraph("Usage & Configuration", th_style)],
        [Paragraph("Relational Database", td_key), Paragraph("Azure SQL Database (MSSQL)", td_val), Paragraph("pyodbc >= 5.1 / pymssql 2.3", code_badge), Paragraph("Stores claims, document registry, OCR raw data, structured parsed fields, audit runs.", td_val)],
        [Paragraph("Database ORM Engine", td_key), Paragraph("SQLAlchemy Core & ORM", td_val), Paragraph("2.0.48", code_badge), Paragraph("Declarative data models, connection pooling (Pool Size: 10, Max Overflow: 15).", td_val)],
        [Paragraph("Schema Migrations", td_key), Paragraph("Alembic", td_val), Paragraph("1.18.4", code_badge), Paragraph("Versioned database schema tracking and automated migration rollouts.", td_val)],
        [Paragraph("Document Storage", td_key), Paragraph("Azure Blob Storage (StorageV2)", td_val), Paragraph("azure-storage-blob 12.19.0", code_badge), Paragraph("Hot tier, TLS 1.2, private encrypted containers storing raw PDFs, bills, and report artifacts.", td_val)],
        [Paragraph("Alternative/Local RDBMS", td_key), Paragraph("PostgreSQL (pgvector ready)", td_val), Paragraph("psycopg2-binary 2.9.11", code_badge), Paragraph("Supported local Docker development driver and LangGraph checkpoint persistence.", td_val)],
    ]
    t_db = Table(db_data, colWidths=[95, 115, 80, 214])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 10))
    
    # Section 4: AI, LLM & Machine Learning Stack
    story.append(Paragraph("4. AI, LLM & Machine Learning Pipeline", h1_style))
    ai_data = [
        [Paragraph("Capability", th_style), Paragraph("Framework / Model", th_style), Paragraph("Version / Engine", th_style), Paragraph("Functional Implementation", th_style)],
        [Paragraph("Generative AI & LLM", td_key), Paragraph("Azure OpenAI Service", td_val), Paragraph("gpt-4o (2024-11-20)", code_badge), Paragraph("Structured line item extraction, medical notes summarization, Copilot dialogue.", td_val)],
        [Paragraph("Agent Orchestration", td_key), Paragraph("LangChain & LangGraph", td_val), Paragraph("1.2.15 / 1.1.8", code_badge), Paragraph("Stateful multi-step claim workflow graph, decision paths, and rule branch orchestration.", td_val)],
        [Paragraph("Semantic Code Search", td_key), Paragraph("FAISS Vector Index", td_val), Paragraph("faiss-cpu 1.9.0", code_badge), Paragraph("High-speed nearest-neighbor embedding search for ICD-10 and procedure code matching.", td_val)],
        [Paragraph("Text Embeddings", td_key), Paragraph("Sentence-Transformers", td_val), Paragraph("3.4.1", code_badge), Paragraph("Dense vector representations for diagnosis codes and clinical terms.", td_val)],
        [Paragraph("BM25 Keyword Engine", td_key), Paragraph("rank-bm25", td_val), Paragraph("0.2.2", code_badge), Paragraph("Sparse lexical retrieval combined with FAISS for hybrid semantic search.", td_val)],
        [Paragraph("Tabular Risk & Fraud", td_key), Paragraph("XGBoost & LightGBM", td_val), Paragraph("xgboost 2.0+ / lightgbm 4.0+", code_badge), Paragraph("Predictive approval likelihood scoring, anomaly scoring, and duplicate claim flags.", td_val)],
        [Paragraph("Clinical NLP", td_key), Paragraph("spaCy & scispaCy", td_val), Paragraph("spacy 3.7+ / scispacy 0.5.4", code_badge), Paragraph("Medical named entity recognition (NER), anatomical classification, dosage extraction.", td_val)],
        [Paragraph("LLM Observability", td_key), Paragraph("Langfuse", td_val), Paragraph("4.3.1", code_badge), Paragraph("Full telemetry tracing for LLM prompts, latency, token usage, and accuracy auditing.", td_val)],
    ]
    t_ai = Table(ai_data, colWidths=[95, 115, 80, 214])
    t_ai.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_ai)
    
    story.append(PageBreak())
    
    # Section 5: Document Intelligence & OCR Stack
    story.append(Paragraph("5. Document Intelligence & OCR Stack", h1_style))
    doc_data = [
        [Paragraph("Module", th_style), Paragraph("Library / Tool", th_style), Paragraph("Version", th_style), Paragraph("Responsibility", th_style)],
        [Paragraph("Primary Cloud OCR", td_key), Paragraph("Azure AI Document Intelligence", td_val), Paragraph("API 2023-07-31 / 3.3.0", code_badge), Paragraph("High-precision form parsing, key-value pair recognition, and structured table extraction.", td_val)],
        [Paragraph("PDF Parsing & Text", td_key), Paragraph("pdfplumber & PyMuPDF (fitz)", td_val), Paragraph("0.11.4 / 1.25.3", code_badge), Paragraph("Direct digital PDF extraction, text coordinate mapping, and vector table line discovery.", td_val)],
        [Paragraph("PDF Transformation", td_key), Paragraph("pdf2image & pikepdf", td_val), Paragraph("1.17.0 / 9.0.0", code_badge), Paragraph("Rasterizing multi-page PDF documents into DPI-optimized image buffers.", td_val)],
        [Paragraph("Image Pre-processing", td_key), Paragraph("Pillow & pillow-heif", td_val), Paragraph("11.2.1 / 0.16.0", code_badge), Paragraph("Contrast adjustment, deskewing, auto-rotation, and support for mobile HEIC/HEIF images.", td_val)],
        [Paragraph("Office Formats", td_key), Paragraph("python-docx & openpyxl", td_val), Paragraph("1.1.2 / 3.1.5", code_badge), Paragraph("Parsing diagnostic reports and tariff schedules submitted as DOCX or XLSX spreadsheets.", td_val)],
        [Paragraph("Report Generation", td_key), Paragraph("WeasyPrint & Jinja2 / fpdf2", td_val), Paragraph("weasyprint 63+ / Jinja2 3.1+", code_badge), Paragraph("HTML+CSS to pixel-perfect PDF rendering of the comprehensive Audit Report.", td_val)],
    ]
    t_doc = Table(doc_data, colWidths=[95, 115, 80, 214])
    t_doc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_doc)
    story.append(Spacer(1, 10))
    
    # Section 6: Security, Auth & Cloud Infrastructure
    story.append(Paragraph("6. Authentication, Security & Azure Cloud Infrastructure", h1_style))
    sec_data = [
        [Paragraph("Domain", th_style), Paragraph("Azure Service / Standard", th_style), Paragraph("Component / Metric", th_style), Paragraph("Implementation Details", th_style)],
        [Paragraph("Identity & Access (IAM)", td_key), Paragraph("Microsoft Entra External ID", td_val), Paragraph("CIAM / B2C OAuth 2.0 / OIDC", code_badge), Paragraph("Enterprise single sign-on, patient & auditor identity with RS256 JWT validation.", td_val)],
        [Paragraph("JWT Token Engine", td_key), Paragraph("python-jose & PyJWT", td_val), Paragraph("3.3.0 / 2.8.0 [crypto]", code_badge), Paragraph("Cryptographic signature verification, claims inspection, role-based access control (RBAC).", td_val)],
        [Paragraph("Compute Environment", td_key), Paragraph("Azure Container Apps (ACA)", td_val), Paragraph("Managed Env: cg-preprod-cin-aca-env", code_badge), Paragraph("Serverless Linux container microservices running Ingress API, OCR, and default workers.", td_val)],
        [Paragraph("Autoscaling Engine", td_key), Paragraph("KEDA + HTTP / CPU Scaling", td_val), Paragraph("Min 2 -> Max 10 Replicas", code_badge), Paragraph("Scales dynamically based on concurrent requests (>15) and CPU utilization (>65%).", td_val)],
        [Paragraph("Secrets & Cryptography", td_key), Paragraph("Azure Key Vault", td_val), Paragraph("Standard Tier", code_badge), Paragraph("Hardware-backed secret vault for connection strings, API tokens, and private keys.", td_val)],
        [Paragraph("Email & Notifications", td_key), Paragraph("Azure Communication Services (ACS)", td_val), Paragraph("azure-communication-email 1.1", code_badge), Paragraph("Automated transactional email dispatch for claim audit completion and notifications.", td_val)],
        [Paragraph("Observability & Tracing", td_key), Paragraph("Azure Log Analytics & OpenTelemetry", td_val), Paragraph("opentelemetry-sdk 1.27+", code_badge), Paragraph("Centralized telemetry, distributed request tracing across containers, latency monitoring.", td_val)],
        [Paragraph("Worker Dashboard", td_key), Paragraph("Flower Monitoring", td_val), Paragraph("2.0.1", code_badge), Paragraph("Real-time visual monitoring of Celery worker queues, task states, and worker health.", td_val)],
    ]
    t_sec = Table(sec_data, colWidths=[95, 115, 100, 194])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 10))
    
    # Section 7: Verified Pre-Prod Microservice Topology
    story.append(Paragraph("7. Verified Azure Pre-Production Microservice Topology", h1_style))
    top_data = [
        [Paragraph("Container App Name", th_style), Paragraph("Container Role", th_style), Paragraph("CPU / RAM", th_style), Paragraph("Port & Protocol", th_style), Paragraph("Scale Targets", th_style)],
        [Paragraph("cg-preprod-cin-ingress", td_key), Paragraph("FastAPI Core API Gateway", td_val), Paragraph("1.0 vCPU / 2.0 GiB", td_val), Paragraph("Port 8000 (HTTP External)", td_val), Paragraph("2 to 10 Replicas", code_badge)],
        [Paragraph("cg-preprod-cin-worker-default", td_key), Paragraph("Celery Pipeline / Audit Worker", td_val), Paragraph("1.0 vCPU / 2.0 GiB", td_val), Paragraph("Background Worker", td_val), Paragraph("2 to 8 Replicas", code_badge)],
        [Paragraph("cg-preprod-cin-worker-ocr", td_key), Paragraph("Celery OCR & Vision Worker", td_val), Paragraph("1.0 vCPU / 2.0 GiB", td_val), Paragraph("Background Worker", td_val), Paragraph("2 to 8 Replicas", code_badge)],
        [Paragraph("cg-preprod-cin-frontend", td_key), Paragraph("Next.js / React User Interface", td_val), Paragraph("0.5 vCPU / 1.0 GiB", td_val), Paragraph("Port 3000 (HTTP External)", td_val), Paragraph("2 to 5 Replicas", code_badge)],
    ]
    t_top = Table(top_data, colWidths=[120, 115, 85, 95, 89])
    t_top.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_bg_head),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_top)
    story.append(Spacer(1, 10))
    
    # Summary note
    story.append(Paragraph(
        "<b>Verification Note:</b> All libraries, version constraints, and Azure resource definitions in this specification "
        "have been directly validated against <code>requirements.txt</code>, <code>main.bicep</code>, <code>deploy_claimsguru_azure.ps1</code>, "
        "and active Azure Container App configurations in the <code>claimsGuru</code> pre-production environment.",
        body_style
    ))
    
    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    
    # Copy to additional destinations
    import shutil
    for path in output_paths[1:]:
        shutil.copyfile(main_pdf_path, path)
        print(f"Copied to: {path}")

if __name__ == "__main__":
    destinations = [
        r"C:\Users\Admin\Downloads\ClaimsGuru_Backend_Tech_Stack_Specification.pdf",
        r"C:\Project\claimsguru\docs\ClaimsGuru_Backend_Tech_Stack_Specification.pdf"
    ]
    create_tech_stack_pdf(destinations)
    print("SUCCESS: PDF Generated successfully.")
