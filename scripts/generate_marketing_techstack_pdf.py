"""
Generate an Executive Marketing & Technical Architecture Brief for ClaimsGuru Backend Tech Stack.
Tailored for Marketing, Sales Enablement, and Enterprise Clients.
Strictly verified against active codebase and pre-production environment.
"""
import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for professional headers, footers and dynamic page counting."""
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "CLAIMSGURU | BACKEND TECHNOLOGY STACK & ARCHITECTURE BRIEF")
            self.setFont("Helvetica", 8)
            self.drawRightString(558, 755, "MARKETING & CLIENT BRIEF")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(54, 747, 558, 747)
            
        # Footer
        self.setFont("Helvetica", 8)
        self.drawString(54, 34, "ClaimsGuru Enterprise Platform  |  Microsoft Azure Pre-Production Verified")
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 34, footer_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 46, 558, 46)
        self.restoreState()

def build_pdf(output_paths):
    for p in output_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
    
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
    
    # Palette
    c_brand = colors.HexColor("#1E3A8A")       # Deep Blue
    c_brand_light = colors.HexColor("#2563EB") # Royal Blue
    c_dark = colors.HexColor("#0F172A")        # Slate 900
    c_sub = colors.HexColor("#475569")         # Slate 600
    c_surface = colors.HexColor("#F8FAFC")     # Light background
    c_card_bg = colors.HexColor("#EFF6FF")     # Soft blue card
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_dark,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_brand_light,
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_brand,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#334155")
    )
    
    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    
    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    
    td_key = ParagraphStyle(
        'TDKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_dark
    )
    
    td_val = ParagraphStyle(
        'TDVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155")
    )
    
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_brand
    )

    story = []
    
    # ── Header Banner ──
    story.append(Paragraph("ClaimsGuru™ Enterprise AI Platform", title_style))
    story.append(Paragraph("BACKEND TECHNOLOGY STACK SPECIFICATION", subtitle_style))
    
    # Marketing Value Badge Grid (Cleaned: No Central India restriction)
    badge_data = [
        [
            Paragraph("<b>Target Infrastructure:</b> Microsoft Azure Cloud", badge_style),
            Paragraph("<b>Core Framework:</b> Python 3.11 + FastAPI", badge_style),
            Paragraph("<b>Primary LLM:</b> Azure OpenAI GPT-4o", badge_style)
        ],
        [
            Paragraph("<b>Architecture:</b> Async Celery Microservices", badge_style),
            Paragraph("<b>Enterprise DB:</b> Azure SQL Database (MSSQL)", badge_style),
            Paragraph("<b>Security & IAM:</b> Microsoft Entra External ID", badge_style)
        ]
    ]
    t_badges = Table(badge_data, colWidths=[180, 160, 164])
    t_badges.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_card_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#DBEAFE")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_badges)
    story.append(Spacer(1, 10))
    
    # ── Executive Summary for Marketing / Clients ──
    story.append(Paragraph("1. Executive Summary: What Powers ClaimsGuru?", h1_style))
    story.append(Paragraph(
        "ClaimsGuru is an intelligent health insurance claim auditing and adjudication platform built to automate "
        "reimbursement claims processing. Running natively on <b>Microsoft Azure</b>, it converts messy, scanned, multi-page "
        "hospital bills, diagnostic receipts, and discharge summaries into structured, verified, and audited expense tables.",
        body_style
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "The backend is built with an <b>asynchronous microservices architecture</b> powered by <b>FastAPI</b>, <b>Celery</b>, "
        "and <b>Azure Cache for Redis</b>. Claim extraction leverages direct parallel calls to <b>Azure OpenAI GPT-4o</b> alongside "
        "<b>Azure AI Document Intelligence</b> for computer vision table parsing, delivering lightning-fast turnaround times with "
        "complete mathematical accuracy.",
        body_style
    ))
    story.append(Spacer(1, 8))
    
    # ── Key Value Drivers (Why Marketing Can Pitch This Confidently) ──
    story.append(Paragraph("2. Enterprise Value Pillars", h1_style))
    
    pitch_boxes = [
        [
            Paragraph("<b>⚡ High-Throughput Async Engine</b><br/>Processes multi-page hospital bills simultaneously with zero UI lag using distributed Celery background workers and in-memory Redis message queues.", callout_text),
            Paragraph("<b>🎯 Precision Extraction</b><br/>Combines Azure Document Intelligence layout analysis with Azure OpenAI GPT-4o parallel semantic parsing to extract complex hospital tariffs and line items accurately.", callout_text)
        ],
        [
            Paragraph("<b>🛡️ Bank-Grade Security & Isolation</b><br/>Protected with Microsoft Entra External ID (OAuth2/OIDC), private Azure Virtual Networks, and hardware-backed Azure Key Vault secret encryption.", callout_text),
            Paragraph("<b>📈 Elastic Cloud Scalability</b><br/>Containerized microservices running on Azure Container Apps with automated autoscaling based on incoming claim traffic volumes.", callout_text)
        ]
    ]
    t_pitch = Table(pitch_boxes, colWidths=[250, 254])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_pitch)
    story.append(Spacer(1, 10))
    
    # ── Tech Stack Master Table ──
    story.append(Paragraph("3. Verified Backend Technology Stack Specifications", h1_style))
    story.append(Paragraph("The following table details the technologies actively used in the ClaimsGuru backend:", body_style))
    story.append(Spacer(1, 4))
    
    tech_table_data = [
        [Paragraph("Architectural Tier", th_style), Paragraph("Core Technology", th_style), Paragraph("Exact Version", th_style), Paragraph("Role & Implementation in Platform", th_style)],
        
        # Runtime & API
        [Paragraph("API Gateway & Services", td_key), Paragraph("Python & FastAPI", td_val), Paragraph("Python 3.11+<br/>FastAPI 0.128", badge_style), 
         Paragraph("Asynchronous, low-latency REST endpoints handling claim lifecycle, document uploads, and real-time status polling.", td_val)],
        
        [Paragraph("ASGI Server Engine", td_key), Paragraph("Uvicorn + uvloop", td_val), Paragraph("uvicorn 0.39<br/>uvloop 0.21", badge_style), 
         Paragraph("High-performance event-loop server built for enterprise multi-tenancy and high concurrency.", td_val)],
         
        # Background Workers & Message Bus
        [Paragraph("Task Queue & Pipeline", td_key), Paragraph("Celery Distributed Queue", td_val), Paragraph("celery 5.4.0", badge_style), 
         Paragraph("Orchestrates deep AI audit pipelines asynchronously so users never experience UI blocking or timeouts.", td_val)],
        
        [Paragraph("In-Memory Cache & Broker", td_key), Paragraph("Azure Cache for Redis", td_val), Paragraph("redis 5.2.1", badge_style), 
         Paragraph("Millisecond state synchronization for real-time progress bars, claim session caching, and task queuing.", td_val)],
        
        [Paragraph("Enterprise Event Messaging", td_key), Paragraph("Azure Service Bus", td_val), Paragraph("SDK 7.14.0", badge_style), 
         Paragraph("Fault-tolerant, guaranteed message delivery and event processing across claim ingress and worker nodes.", td_val)],
         
        # Databases & Storage
        [Paragraph("Enterprise Database", td_key), Paragraph("Azure SQL Database (MSSQL)", td_val), Paragraph("SQLAlchemy 2.0<br/>pyodbc / pymssql", badge_style), 
         Paragraph("ACID-compliant storage for claims, hospital data, ICD-10 medical records, and audit findings with connection pooling.", td_val)],
        
        [Paragraph("Schema Migrations", td_key), Paragraph("Alembic", td_val), Paragraph("alembic 1.18", badge_style), 
         Paragraph("Automated, version-controlled relational database schema updates and tracking.", td_val)],

        [Paragraph("Secure Document Lake", td_key), Paragraph("Azure Blob Storage", td_val), Paragraph("StorageV2 (Hot)<br/>TLS 1.2+ HTTPS", badge_style), 
         Paragraph("Encrypted object storage holding raw medical records, scanned receipts, and generated audit report PDFs.", td_val)],
         
        # AI & Vision
        [Paragraph("Generative AI & LLM", td_key), Paragraph("Azure OpenAI Service", td_val), Paragraph("GPT-4o<br/>(API: 2024-11-20)", badge_style), 
         Paragraph("Direct asynchronous REST integration for semantic table parsing, clinical entity extraction, and rate-limit backoff.", td_val)],
        
        [Paragraph("Computer Vision & OCR", td_key), Paragraph("Azure AI Document Intelligence", td_val), Paragraph("API 2023-07-31<br/>Form Recognizer", badge_style), 
         Paragraph("Deep layout parsing, table structure extraction, and bounding-box coordinates for Indian hospital bills.", td_val)],
         
        [Paragraph("PDF Parsing & Rasterizing", td_key), Paragraph("PyMuPDF & pdfplumber", td_val), Paragraph("pymupdf 1.25<br/>pdfplumber 0.11", badge_style), 
         Paragraph("High-speed digital text extraction, DPI-optimized rendering, and vector line detection for medical PDFs.", td_val)],
         
        [Paragraph("Semantic Catalog Search", td_key), Paragraph("FAISS Vector DB + BM25", td_val), Paragraph("faiss-cpu 1.9<br/>rank-bm25 0.2", badge_style), 
         Paragraph("Hybrid lexical and semantic lookup of standard ICD-10 medical diagnostic codes and procedure master packages.", td_val)],
         
        [Paragraph("Predictive Analytics", td_key), Paragraph("XGBoost & LightGBM", td_val), Paragraph("xgboost 2.0+<br/>lightgbm 4.0+", badge_style), 
         Paragraph("Machine-learning risk assessment flagging duplicate claims and billing anomalies.", td_val)],
         
        [Paragraph("Enterprise Identity (IAM)", td_key), Paragraph("Microsoft Entra External ID", td_val), Paragraph("CIAM OAuth2<br/>OIDC & RS256 JWT", badge_style), 
         Paragraph("Single Sign-On (SSO) and Role-Based Access Control (RBAC) ensuring only authorized claim officers access sensitive data.", td_val)],
        
        [Paragraph("Secrets & Privacy Vault", td_key), Paragraph("Azure Key Vault", td_val), Paragraph("Hardware HSM", badge_style), 
         Paragraph("Centralized cryptographic key and secret management meeting strict enterprise compliance standards.", td_val)],
        
        [Paragraph("Email & Notifications", td_key), Paragraph("Azure Communication Services", td_val), Paragraph("ACS Email SDK", badge_style), 
         Paragraph("Automated transactional email dispatch notifying claimants and claim officers the moment an audit is ready.", td_val)],
        
        [Paragraph("Automated Report Engine", td_key), Paragraph("WeasyPrint + Jinja2", td_val), Paragraph("weasyprint 63+<br/>Jinja2 3.1", badge_style), 
         Paragraph("Generates official, print-ready, pixel-perfect PDF Audit Reports with breakdown charts and regulatory citations.", td_val)],
    ]
    
    t_tech = Table(tech_table_data, colWidths=[95, 115, 80, 214])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_surface]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))
    
    # Concluding Note (Cleaned: No Central India restriction)
    story.append(Paragraph(
        "<b>Verification Note:</b> All technologies, libraries, and cloud services in this document reflect the active "
        "codebase and live deployment in the <code>claimsGuru</code> Microsoft Azure pre-production environment.",
        ParagraphStyle('FooterCallout', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, leading=10.5, textColor=c_sub)
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    
    for p in output_paths[1:]:
        shutil.copyfile(main_pdf_path, p)
        print(f"Copied to: {p}")

if __name__ == "__main__":
    destinations = [
        r"C:\Users\Admin\Downloads\ClaimsGuru_Backend_Tech_Stack_Marketing_Brief.pdf",
        r"C:\Project\claimsguru\docs\ClaimsGuru_Backend_Tech_Stack_Marketing_Brief.pdf"
    ]
    build_pdf(destinations)
    print("SUCCESS: Clean Marketing PDF (Region neutral) Generated successfully.")
