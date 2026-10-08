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
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;padding:30px 10px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px -15px rgba(0,0,0,0.5);border:1px solid #334155;">
                    <tr>
                        <td style="background:linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%);padding:36px 32px 30px 32px;text-align:center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom:14px;">
                                        <div style="display:inline-block;background:#ffffff;padding:8px 22px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
                                            <img src="https://cg-preprod-cin-frontend.purpleocean-4441f644.centralindia.azurecontainerapps.io/image.png" alt="ClaimsGuru" width="190" style="display:block;width:190px;max-width:190px;height:auto;" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                                            Welcome to ClaimsGuru
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 28px 24px 28px;">
                            <p style="margin:0 0 16px 0;color:#0f172a;font-size:16px;font-weight:700;">
                                Welcome aboard, {user_name}! 👋
                            </p>
                            <p style="margin:0 0 20px 0;color:#475569;font-size:14px;line-height:1.6;">
                                Your ClaimsGuru account has been successfully initialized and linked to <strong>{user_email}</strong>. You now have full access to automated health claim processing and tracking.
                            </p>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                                <tr>
                                    <td>
                                        <div style="color:#166534;font-size:14px;font-weight:700;margin-bottom:10px;">What You Can Do:</div>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding:4px 0;font-size:13px;color:#334155;line-height:1.5;">⚡ <strong>1-Click Claim Uploads:</strong> Submit medical bills and discharge records instantly.</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0;font-size:13px;color:#334155;line-height:1.5;">🤖 <strong>AI Verification:</strong> Automated OCR, clinical entity coding (ICD-10/CPT), and fraud scoring.</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:4px 0;font-size:13px;color:#334155;line-height:1.5;">📊 <strong>Live Adjudication Tracking:</strong> Real-time progress updates and downloadable audit packs.</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:10px 0 20px 0;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);box-shadow:0 10px 20px -5px rgba(2,132,199,0.4);">
                                                    <a href="{dashboard_url}" target="_blank" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:800;color:#ffffff !important;text-decoration:none;letter-spacing:0.3px;border-radius:12px;">
                                                        Access Your Dashboard &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                                &copy; 2026 ClaimsGuru AI Platform &bull; ISO 27001 Certified &bull; HIPAA Compliant
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
    subject = f"[ClaimsGuru] Claim Received – #{claim_id[:8]} is Under Processing ⏳"
    
    display_hospital = hospital_name if (hospital_name and "treating" not in hospital_name.lower()) else "⏳ Extracting from medical documents..."
    display_amount = claim_amount if (claim_amount and "under" not in claim_amount.lower()) else "⏳ Calculating from itemized hospital bills..."

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;padding:30px 10px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px -15px rgba(0,0,0,0.5);border:1px solid #334155;">
                    <tr>
                        <td style="background:linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%);padding:36px 32px 30px 32px;text-align:center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom:14px;">
                                        <div style="display:inline-block;background:#ffffff;padding:8px 22px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
                                            <img src="https://cg-preprod-cin-frontend.purpleocean-4441f644.centralindia.azurecontainerapps.io/image.png" alt="ClaimsGuru" width="190" style="display:block;width:190px;max-width:190px;height:auto;" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                                            Claim Submission Acknowledged
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:10px;">
                                        <div style="display:inline-block;background:#fef08a;color:#854d0e;border:1px solid #fde047;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
                                            ⏳ Under AI Adjudication
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 28px 24px 28px;">
                            <p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">
                                Dear <strong>{patient_name}</strong>,
                            </p>
                            <p style="margin:0 0 24px 0;color:#475569;font-size:14px;line-height:1.6;">
                                We have successfully received your medical claim documents on the ClaimsGuru platform. Our automated AI adjudication pipeline has begun processing your submission.
                            </p>

                            <!-- Key-Value Grid -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 20px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Claim Reference</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;width:62%;">
                                        <span style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;padding:2px 8px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:12px;font-weight:700;">
                                            #{claim_id[:18]}...
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Submitted On</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{submitted_date}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Provider / Hospital</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{display_hospital}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Claim Amount</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{display_amount}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:600;width:38%;">Files Uploaded</td>
                                    <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{file_count} document(s)</td>
                                </tr>
                            </table>

                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:10px 0 20px 0;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);box-shadow:0 10px 20px -5px rgba(2,132,199,0.4);">
                                                    <a href="{tracking_url}" target="_blank" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:800;color:#ffffff !important;text-decoration:none;letter-spacing:0.3px;border-radius:12px;">
                                                        Track Live Claim Status &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                                &copy; 2026 ClaimsGuru AI Platform &bull; ISO 27001 Certified &bull; HIPAA Compliant
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
    
    formatted_codes = ""
    if icd_codes:
        formatted_codes = "".join([
            f'<span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:700;margin:2px 4px 2px 0;font-family:\'SF Pro Display\',-apple-system,BlinkMacSystemFont,sans-serif;">{c}</span>'
            for c in icd_codes[:5]
        ])

    risk_display = "Low Risk (Admissible)"
    risk_color = "#047857"
    risk_bg = "#ecfdf5"
    risk_border = "#a7f3d0"
    risk_icon = "✓"
    if risk_score is not None:
        try:
            val = float(str(risk_score).replace("%", ""))
            if val > 0.5:
                pct = f"{val*100:.0f}%" if val <= 1 else f"{val:.0f}%"
                risk_display = f"Elevated Risk ({pct})"
                risk_color = "#b91c1c"
                risk_bg = "#fef2f2"
                risk_border = "#fecaca"
                risk_icon = "▲"
            else:
                pct = f"{val*100:.0f}%" if val <= 1 else f"{val:.0f}%"
                risk_display = f"Low Risk ({pct})"
                risk_color = "#047857"
                risk_bg = "#ecfdf5"
                risk_border = "#a7f3d0"
                risk_icon = "✓"
        except Exception:
            risk_display = str(risk_score)

    stay_row = ""
    if admission_date or discharge_date:
        adm = admission_date or "N/A"
        dis = discharge_date or "N/A"
        stay_row = f"""
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Treatment Period</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{adm} &rarr; {dis}</td>
        </tr>
        """

    code_row = ""
    if formatted_codes:
        code_row = f"""
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;vertical-align:middle;">ICD-10 / CPT Codes</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;width:62%;vertical-align:middle;">{formatted_codes}</td>
        </tr>
        """

    tpa_pdf_name = f"TPA_Claim_Audit_{claim_id[:8]}.pdf"
    irda_pdf_name = f"IRDAI_Adjudication_Sheet_{claim_id[:8]}.pdf"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <!-- Background Wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0f172a;padding:30px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container Card -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px -15px rgba(0,0,0,0.5);border:1px solid #334155;">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background:linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%);padding:36px 32px 30px 32px;text-align:center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom:16px;">
                                        <!-- Logo Brand Header -->
                                        <div style="display:inline-block;background:#ffffff;padding:8px 22px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                                            <img src="https://cg-preprod-cin-frontend.purpleocean-4441f644.centralindia.azurecontainerapps.io/image.png" alt="ClaimsGuru" width="190" style="display:block;width:190px;max-width:190px;height:auto;" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.3;">
                                            Claim Adjudication Complete
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top:10px;">
                                        <div style="display:inline-block;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
                                            ✓ 100% Processed & Verified
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding:32px 28px 24px 28px;">
                            <p style="margin:0 0 16px 0;color:#0f172a;font-size:15px;line-height:1.6;">
                                Dear <strong>{patient_name}</strong>,
                            </p>
                            <p style="margin:0 0 24px 0;color:#475569;font-size:14px;line-height:1.6;">
                                Your health insurance reimbursement claim has successfully completed end-to-end automated clinical audit, OCR document parsing, ICD-10/CPT coding, and tariff compliance validation.
                            </p>

                            <!-- Financial Hero Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:20px 24px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
                                                    Total Claimed Amount
                                                </td>
                                                <td style="text-align:right;">
                                                    <span style="display:inline-block;background:{risk_bg};color:{risk_color};border:1px solid {risk_border};padding:3px 10px;border-radius:100px;font-size:11px;font-weight:800;">
                                                        {risk_icon} {risk_display}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding-top:6px;">
                                                    <span style="color:#0f172a;font-size:28px;font-weight:800;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;">
                                                        {display_amount}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Detailed Adjudication Key-Value Table -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 20px;margin-bottom:24px;">
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Claim Reference</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;width:62%;">
                                        <span style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;padding:2px 8px;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:12px;font-weight:700;">
                                            #{claim_id[:18]}...
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Provider / Hospital</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{display_hospital}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:38%;">Primary Diagnosis</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:700;text-align:right;width:62%;">{display_diagnosis}</td>
                                </tr>
                                {stay_row}
                                {code_row}
                            </table>

                            <!-- Included PDF Attachments Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:28px;">
                                <tr>
                                    <td style="padding:18px 20px;">
                                        <div style="color:#166534;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px;">
                                            📎 Attached Reports (Included in this Email):
                                        </div>
                                        
                                        <!-- Report 1 -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #86efac;border-radius:10px;margin-bottom:8px;">
                                            <tr>
                                                <td style="padding:10px 14px;width:32px;vertical-align:middle;text-align:center;font-size:20px;">
                                                    📄
                                                </td>
                                                <td style="padding:10px 14px 10px 0;vertical-align:middle;">
                                                    <div style="color:#0f172a;font-size:13px;font-weight:700;">{tpa_pdf_name}</div>
                                                    <div style="color:#64748b;font-size:11px;margin-top:2px;">Itemized clinical audit, tariff justifications, room rent ceilings & validation rules</div>
                                                </td>
                                                <td style="padding:10px 14px;text-align:right;vertical-align:middle;">
                                                    <span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;">PDF Attached</span>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Report 2 -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #86efac;border-radius:10px;">
                                            <tr>
                                                <td style="padding:10px 14px;width:32px;vertical-align:middle;text-align:center;font-size:20px;">
                                                    📋
                                                </td>
                                                <td style="padding:10px 14px 10px 0;vertical-align:middle;">
                                                    <div style="color:#0f172a;font-size:13px;font-weight:700;">{irda_pdf_name}</div>
                                                    <div style="color:#64748b;font-size:11px;margin-top:2px;">Standardized Indian regulatory settlement worksheet with breakdown</div>
                                                </td>
                                                <td style="padding:10px 14px;text-align:right;vertical-align:middle;">
                                                    <span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;">PDF Attached</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Primary CTA Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom:12px;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#059669 0%,#047857 100%);box-shadow:0 10px 20px -5px rgba(5,150,105,0.4);">
                                                    <a href="{report_url}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:800;color:#ffffff !important;text-decoration:none;letter-spacing:0.3px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
                                                        Access Live Interactive Audit &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <p style="margin:0;color:#94a3b8;font-size:11px;">
                                            Link: <a href="{report_url}" style="color:#059669;text-decoration:underline;">{report_url}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Institutional Footer -->
                    <tr>
                        <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 28px;text-align:center;">
                            <p style="margin:0 0 6px 0;color:#64748b;font-size:12px;font-weight:700;">
                                ClaimsGuru Healthcare AI Platform &bull; Intelligent Claim Adjudication
                            </p>
                            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                                IRDAI Aligned &bull; ISO 27001 Certified &bull; HIPAA Compliant Security<br>
                                This automated verification email was securely dispatched on behalf of your treating hospital and insurance provider.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
- {tpa_pdf_name}
- {irda_pdf_name}

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

