"""Notification templates for Email (HTML) and WhatsApp (Formatted Text)."""

from typing import Any


def render_welcome_email(user_name: str, user_email: str, dashboard_url: str) -> dict[str, str]:
    """Generate HTML and plain text for the user welcome email."""
    subject = "Welcome to ClaimsGuru – Your Health Insurance Claims Simplified 🚀"
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }}
        .container {{
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            padding: 32px 24px;
            text-align: center;
            color: #ffffff;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }}
        .header p {{
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }}
        .content {{
            padding: 32px 24px;
        }}
        .greeting {{
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 16px;
        }}
        .feature-box {{
            background-color: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
        }}
        .feature-box h3 {{
            margin: 0 0 8px 0;
            color: #15803d;
            font-size: 16px;
        }}
        .feature-box ul {{
            margin: 0;
            padding-left: 20px;
            color: #334155;
            font-size: 14px;
        }}
        .cta-container {{
            text-align: center;
            margin: 32px 0;
        }}
        .cta-button {{
            display: inline-block;
            background: #0284c7;
            color: #ffffff !important;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
        }}
        .footer {{
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ClaimsGuru AI Platform</h1>
            <p>Next-Generation Health Insurance Adjudication</p>
        </div>
        <div class="content">
            <div class="greeting">Welcome aboard, {user_name}! 👋</div>
            <p>Your account on ClaimsGuru has been successfully initialized and verified for <strong>{user_email}</strong>.</p>
            
            <div class="feature-box">
                <h3>What You Can Do:</h3>
                <ul>
                    <li><strong>Upload Claims Instantly:</strong> Submit medical bills, discharge summaries, and diagnostic receipts with 1-click.</li>
                    <li><strong>AI Document Processing:</strong> Real-time OCR, clinical entity extraction, and automated policy verification.</li>
                    <li><strong>Live Claim Tracking:</strong> Receive instant progress updates at each stage of the review workflow.</li>
                </ul>
            </div>

            <div class="cta-container">
                <a href="{dashboard_url}" class="cta-button" target="_blank">Access Your Dashboard &rarr;</a>
            </div>

            <p style="font-size: 13px; color: #64748b;">
                Need help? Simply reply to this email or reach out to our dedicated support desk.
            </p>
        </div>
        <div class="footer">
            &copy; 2026 ClaimsGuru AI Platform. All rights reserved.<br>
            Secure Health Information Management System.
        </div>
    </div>
</body>
</html>"""

    plain_text = f"""Welcome to ClaimsGuru!

Hi {user_name},

Your account has been successfully created.
Registered Email: {user_email}

Access your dashboard here:
{dashboard_url}

Best regards,
The ClaimsGuru Team
"""
    return {"subject": subject, "html": html_content, "plain_text": plain_text}


def render_welcome_whatsapp(user_name: str, user_email: str, dashboard_url: str) -> str:
    """Generate structured WhatsApp message for user signup."""
    return (
        f"Hi *{user_name}* 👋\n\n"
        f"Welcome to *ClaimsGuru*! 🏥\n\n"
        f"Your account is now active. You can easily upload medical bills, track reimbursement status in real-time, and get fast-tracked claim processing.\n\n"
        f"🔹 *Registered Email:* {user_email}\n"
        f"🔹 *Dashboard Link:* {dashboard_url}\n\n"
        f"_– Team ClaimsGuru_"
    )


def render_claim_received_email(
    patient_name: str,
    claim_id: str,
    hospital_name: str | None,
    claim_amount: str | None,
    submitted_date: str,
    file_count: int,
    tracking_url: str,
) -> dict[str, str]:
    """Generate HTML and plain text for claim upload/intake email."""
    subject = f"[ClaimsGuru] Claim Received – #{claim_id} is Under Processing ⏳"
    
    display_hospital = hospital_name if (hospital_name and "treating" not in hospital_name.lower()) else "⏳ Extracting from medical documents..."
    display_amount = claim_amount if (claim_amount and "under" not in claim_amount.lower()) else "⏳ Calculating from itemized hospital bills..."

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }}
        .container {{
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            padding: 28px 24px;
            text-align: center;
            color: #ffffff;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
            font-weight: 700;
        }}
        .status-badge {{
            display: inline-block;
            background: #fef08a;
            color: #854d0e;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .content {{
            padding: 32px 24px;
        }}
        .card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }}
        .card-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #edf2f7;
            font-size: 14px;
        }}
        .card-row:last-child {{
            border-bottom: none;
        }}
        .card-label {{
            color: #64748b;
            font-weight: 500;
        }}
        .card-value {{
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }}
        .pipeline-steps {{
            margin: 24px 0;
        }}
        .pipeline-title {{
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .step-item {{
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;
        }}
        .step-icon {{
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 12px;
            font-weight: bold;
        }}
        .step-done {{
            background-color: #dcfce7;
            color: #15803d;
        }}
        .step-active {{
            background-color: #e0f2fe;
            color: #0284c7;
            animation: pulse 2s infinite;
        }}
        .step-pending {{
            background-color: #f1f5f9;
            color: #94a3b8;
        }}
        .cta-container {{
            text-align: center;
            margin: 32px 0 16px 0;
        }}
        .cta-button {{
            display: inline-block;
            background: #0284c7;
            color: #ffffff !important;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
        }}
        .footer {{
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Claim Submission Acknowledgment</h1>
            <div class="status-badge">⏳ Under AI Processing</div>
        </div>
        <div class="content">
            <p>Dear <strong>{patient_name}</strong>,</p>
            <p>We have successfully received your medical claim documents on the ClaimsGuru platform. Our automated adjudication pipeline is actively analyzing your files.</p>
            
            <div class="card">
                <div class="card-row">
                    <span class="card-label">Claim Reference ID</span>
                    <span class="card-value" style="color: #0284c7; font-family: monospace; font-size: 15px;">#{claim_id}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Submitted On</span>
                    <span class="card-value">{submitted_date}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Provider / Hospital</span>
                    <span class="card-value">{display_hospital}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Claim Amount</span>
                    <span class="card-value">{display_amount}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Files Uploaded</span>
                    <span class="card-value">{file_count} document(s)</span>
                </div>
            </div>

            <div class="pipeline-steps">
                <div class="pipeline-title">Live Processing Stages:</div>
                <div class="step-item">
                    <div class="step-icon step-done">✓</div>
                    <div><strong>Document Intake:</strong> Files securely stored and indexed.</div>
                </div>
                <div class="step-item">
                    <div class="step-icon step-active">⚡</div>
                    <div><strong>Optical Character Recognition (OCR):</strong> High-precision text & table extraction.</div>
                </div>
                <div class="step-item">
                    <div class="step-icon step-pending">3</div>
                    <div><strong>Clinical Coding & Rules:</strong> ICD-10 mapping, tariff validation, and fraud screening.</div>
                </div>
            </div>

            <div class="cta-container">
                <a href="{tracking_url}" class="cta-button" target="_blank">Track Live Claim Status &rarr;</a>
            </div>
        </div>
        <div class="footer">
            &copy; 2026 ClaimsGuru AI Platform. All rights reserved.<br>
            Secure Health Information Management System.
        </div>
    </div>
</body>
</html>"""

    plain_text = f"""[ClaimsGuru] Claim Submission Acknowledged

Dear {patient_name},

We have received your claim submission.
Claim ID: #{claim_id}
Submitted Date: {submitted_date}
Provider: {display_hospital}
Amount: {display_amount}
Files Uploaded: {file_count}

Track your claim live:
{tracking_url}

– Team ClaimsGuru
"""
    return {"subject": subject, "html": html_content, "plain_text": plain_text}


def render_claim_received_whatsapp(
    patient_name: str,
    claim_id: str,
    hospital_name: str | None,
    claim_amount: str | None,
    tracking_url: str,
) -> str:
    """Generate structured WhatsApp message for claim upload."""
    display_hospital = hospital_name if (hospital_name and "treating" not in hospital_name.lower()) else "Extracting from medical records..."
    display_amount = claim_amount if (claim_amount and "under" not in claim_amount.lower()) else "Calculating from bills..."
    
    return (
        f"Hi *{patient_name}* 📋\n\n"
        f"We’ve successfully received your claim submission on *ClaimsGuru*.\n\n"
        f"*Claim Details:*\n"
        f"• *Claim ID:* #{claim_id}\n"
        f"• *Hospital:* {display_hospital}\n"
        f"• *Amount:* {display_amount}\n"
        f"• *Status:* ⏳ *Under AI Extraction & Verification*\n\n"
        f"👉 *Track Live Status:* {tracking_url}\n\n"
        f"_– ClaimsGuru Support_"
    )


def render_claim_processed_email(
    patient_name: str,
    claim_id: str,
    hospital_name: str | None,
    claim_amount: str | None,
    diagnosis: str | None,
    icd_codes: list[str] | None,
    risk_score: str | float | None,
    admission_date: str | None,
    discharge_date: str | None,
    report_url: str,
    has_tpa_pdf: bool = True,
    has_irda_pdf: bool = True,
) -> dict[str, str]:
    """Generate rich HTML and plain text for claim adjudication completed email with attached reports."""
    subject = f"[ClaimsGuru] Claim Adjudication Complete – #{claim_id[:8]} Summary & Audit Reports 📋"
    
    display_hospital = hospital_name or "Treating Healthcare Provider"
    display_amount = claim_amount or "₹0.00"
    display_diagnosis = diagnosis or "Clinical Review Completed"
    
    code_badges = ""
    if icd_codes:
        formatted_codes = "".join([f'<span style="display:inline-block;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-right:4px;">{c}</span>' for c in icd_codes[:5]])
        code_badges = f'<div class="card-row"><span class="card-label">ICD-10 / CPT Codes</span><span class="card-value">{formatted_codes}</span></div>'

    risk_display = "Low Risk (Admissible)"
    risk_color = "#15803d"
    risk_bg = "#dcfce7"
    if risk_score is not None:
        try:
            val = float(str(risk_score).replace("%", ""))
            if val > 0.5:
                risk_display = f"Elevated Risk ({val*100:.0f}%)" if val <= 1 else f"Elevated Risk ({val:.0f}%)"
                risk_color = "#b91c1c"
                risk_bg = "#fee2e2"
            else:
                risk_display = f"Low Risk ({val*100:.0f}%)" if val <= 1 else f"Low Risk ({val:.0f}%)"
        except Exception:
            risk_display = str(risk_score)

    stay_info = ""
    if admission_date or discharge_date:
        adm = admission_date or "N/A"
        dis = discharge_date or "N/A"
        stay_info = f'<div class="card-row"><span class="card-label">Treatment Period</span><span class="card-value">{adm} &rarr; {dis}</span></div>'

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }}
        .container {{
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            padding: 28px 24px;
            text-align: center;
            color: #ffffff;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
            font-weight: 700;
        }}
        .status-badge {{
            display: inline-block;
            background: #dcfce7;
            color: #15803d;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .content {{
            padding: 32px 24px;
        }}
        .card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }}
        .card-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #edf2f7;
            font-size: 14px;
        }}
        .card-row:last-child {{
            border-bottom: none;
        }}
        .card-label {{
            color: #64748b;
            font-weight: 500;
        }}
        .card-value {{
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }}
        .attachments-box {{
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
        }}
        .attachments-title {{
            font-size: 14px;
            font-weight: 700;
            color: #166534;
            margin-bottom: 8px;
        }}
        .attachment-item {{
            display: flex;
            align-items: center;
            font-size: 13px;
            color: #14532d;
            margin-top: 6px;
        }}
        .cta-container {{
            text-align: center;
            margin: 32px 0 16px 0;
        }}
        .cta-button {{
            display: inline-block;
            background: #059669;
            color: #ffffff !important;
            padding: 14px 28px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);
        }}
        .footer {{
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Claim Adjudication Complete</h1>
            <div class="status-badge">✓ 100% Processed & Verified</div>
        </div>
        <div class="content">
            <p>Dear <strong>{patient_name}</strong>,</p>
            <p>Your hospital reimbursement claim has completed full AI parsing, clinical coding, tariff auditing, and policy validation.</p>
            
            <div class="card">
                <div class="card-row">
                    <span class="card-label">Claim Reference ID</span>
                    <span class="card-value" style="color: #059669; font-family: monospace; font-size: 15px;">#{claim_id}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Provider / Hospital</span>
                    <span class="card-value">{display_hospital}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Claim Amount</span>
                    <span class="card-value" style="font-size: 16px; color: #0f172a;">{display_amount}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Primary Diagnosis</span>
                    <span class="card-value">{display_diagnosis}</span>
                </div>
                {stay_info}
                {code_badges}
                <div class="card-row">
                    <span class="card-label">AI Risk Assessment</span>
                    <span class="card-value" style="color: {risk_color}; background: {risk_bg}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{risk_display}</span>
                </div>
            </div>

            <div class="attachments-box">
                <div class="attachments-title">📎 Attached Reports for Insurer / TPA Submission:</div>
                <div class="attachment-item">📄 <strong>TPA_Claim_Audit_Report.pdf</strong> &mdash; Comprehensive clinical audit & tariff breakdown</div>
                <div class="attachment-item">📋 <strong>IRDAI_Adjudication_Summary.pdf</strong> &mdash; Standardized IRDAI settlement worksheet</div>
            </div>

            <div class="cta-container">
                <a href="{report_url}" class="cta-button" target="_blank">View Live Interactive Audit &rarr;</a>
            </div>
        </div>
        <div class="footer">
            &copy; 2026 ClaimsGuru AI Platform. All rights reserved.<br>
            Secure Health Information Management System.
        </div>
    </div>
</body>
</html>"""

    plain_text = f"""[ClaimsGuru] Claim Adjudication Complete

Dear {patient_name},

Your claim adjudication is 100% complete.
Claim ID: #{claim_id}
Provider: {display_hospital}
Claim Amount: {display_amount}
Diagnosis: {display_diagnosis}
Risk Assessment: {risk_display}

Attached Reports:
- TPA_Claim_Audit_Report.pdf
- IRDAI_Adjudication_Summary.pdf

View Interactive Audit:
{report_url}

– Team ClaimsGuru
"""
    return {"subject": subject, "html": html_content, "plain_text": plain_text}


def render_claim_processed_whatsapp(
    patient_name: str,
    claim_id: str,
    hospital_name: str | None,
    claim_amount: str | None,
    diagnosis: str | None,
    report_url: str,
) -> str:
    """Generate structured WhatsApp message for completed claim."""
    display_hospital = hospital_name or "Treating Provider"
    display_amount = claim_amount or "₹0.00"
    display_diag = diagnosis or "Clinical Review Complete"

    return (
        f"Hello *{patient_name}* ✅\n\n"
        f"Your claim *#{claim_id[:8]}* adjudication is *100% Complete* on ClaimsGuru!\n\n"
        f"🏥 *Hospital:* {display_hospital}\n"
        f"💰 *Claim Amount:* {display_amount}\n"
        f"🩺 *Diagnosis:* {display_diag}\n"
        f"📎 *TPA & IRDAI Reports:* Ready & attached to your email.\n\n"
        f"👉 *View Full Audit:* {report_url}\n\n"
        f"_– ClaimsGuru Support_"
    )

