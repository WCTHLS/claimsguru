"""High-level NotificationService orchestrating templates, drivers, and safe async delivery."""

import logging
import os
from typing import Any

from .drivers import (
    AzureCommunicationEmailDriver,
    AzureCommunicationMessagesDriver,
    BaseEmailDriver,
    BaseWhatsAppDriver,
    ConsoleMockDriver,
)
from .templates import (
    render_claim_processed_email,
    render_claim_processed_whatsapp,
    render_claim_received_email,
    render_claim_received_whatsapp,
    render_welcome_email,
    render_welcome_whatsapp,
)

logger = logging.getLogger("notifications")


class NotificationService:
    """Enterprise notification coordinator for ClaimsGuru."""

    def __init__(
        self,
        email_driver: BaseEmailDriver | None = None,
        whatsapp_driver: BaseWhatsAppDriver | None = None,
    ):
        self.mock_driver = ConsoleMockDriver()

        # Initialize Azure Email Driver or fallback
        if email_driver:
            self.email_driver = email_driver
        else:
            azure_email = AzureCommunicationEmailDriver()
            self.email_driver = azure_email if azure_email.is_configured() else self.mock_driver

        # Initialize Azure Messaging (WhatsApp/SMS) Driver or fallback
        if whatsapp_driver:
            self.whatsapp_driver = whatsapp_driver
        else:
            azure_msg = AzureCommunicationMessagesDriver()
            self.whatsapp_driver = azure_msg if azure_msg.is_configured() else self.mock_driver

    def _get_base_url(self, base_url: str | None = None) -> str:
        """Resolve public web portal URL dynamically from caller, environment, or deployment."""
        if base_url and str(base_url).strip():
            return str(base_url).strip().rstrip("/")

        # Check explicit frontend URL environment variables
        for env_key in ("FRONTEND_URL", "APP_BASE_URL", "NEXT_PUBLIC_APP_URL", "WEB_URL"):
            val = os.getenv(env_key)
            if val and val.strip():
                return val.strip().rstrip("/")

        # Check if running in Azure Container Apps or Azure App Service
        azure_host = os.getenv("WEBSITE_HOSTNAME")
        if azure_host:
            scheme = "http" if "localhost" in azure_host else "https"
            return f"{scheme}://{azure_host}".rstrip("/")

        # Check environment mode
        app_env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").lower()
        if app_env in ("production", "prod", "staging", "preprod"):
            return "https://cg-preprod-cin-frontend.purpleocean-4441f644.centralindia.azurecontainerapps.io"

        # Default to local development
        return "http://localhost:3000"

    def send_welcome_notification(
        self,
        email: str,
        name: str | None = None,
        phone: str | None = None,
        base_url: str | None = None,
    ) -> dict[str, Any]:
        """Dispatch welcome email and WhatsApp notification to a newly registered user."""
        user_name = (name or email.split("@")[0] or "User").strip()
        dashboard_url = f"{self._get_base_url(base_url)}/app"

        email_data = render_welcome_email(user_name=user_name, user_email=email, dashboard_url=dashboard_url)
        whatsapp_text = render_welcome_whatsapp(user_name=user_name, user_email=email, dashboard_url=dashboard_url)

        email_sent = False
        whatsapp_sent = False

        # 1. Send Email
        try:
            email_sent = self.email_driver.send_email(
                to_email=email,
                subject=email_data["subject"],
                html_body=email_data["html"],
                plain_text=email_data["plain_text"],
            )
            # If driver didn't succeed (e.g. unconfigured), log via mock driver
            if not email_sent and self.email_driver is not self.mock_driver:
                self.mock_driver.send_email(
                    to_email=email,
                    subject=email_data["subject"],
                    html_body=email_data["html"],
                    plain_text=email_data["plain_text"],
                )
        except Exception as exc:
            logger.exception(f"Welcome email dispatch failed for {email}: {exc}")

        # 2. Send WhatsApp / SMS (if phone number is present)
        if phone:
            try:
                whatsapp_sent = self.whatsapp_driver.send_whatsapp_message(
                    to_phone=phone,
                    message_text=whatsapp_text,
                )
                if not whatsapp_sent and self.whatsapp_driver is not self.mock_driver:
                    self.mock_driver.send_whatsapp_message(
                        to_phone=phone,
                        message_text=whatsapp_text,
                    )
            except Exception as exc:
                logger.exception(f"Welcome WhatsApp dispatch failed for {phone}: {exc}")

        return {
            "event": "USER_WELCOME",
            "email": email,
            "phone": phone,
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
        }

    def send_claim_received_notification(
        self,
        claim_id: str,
        email: str | None = None,
        phone: str | None = None,
        patient_name: str | None = None,
        hospital_name: str | None = None,
        claim_amount: str | float | None = None,
        submitted_date: str | None = None,
        file_count: int = 1,
        base_url: str | None = None,
    ) -> dict[str, Any]:
        """Dispatch claim receipt email and WhatsApp notification on claim intake."""
        resolved_name = (patient_name or "Patient").strip()
        resolved_hospital = (hospital_name or "Treating Hospital / Clinic").strip()
        
        if claim_amount:
            try:
                num_amt = float(str(claim_amount).replace(",", "").replace("₹", "").strip())
                resolved_amount = f"₹{num_amt:,.2f}"
            except Exception:
                resolved_amount = f"₹{claim_amount}"
        else:
            resolved_amount = "Under Verification"

        from datetime import datetime, timezone
        resolved_date = submitted_date or datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")
        tracking_url = f"{self._get_base_url(base_url)}/app?claim_id={claim_id}"

        email_data = render_claim_received_email(
            patient_name=resolved_name,
            claim_id=claim_id,
            hospital_name=resolved_hospital,
            claim_amount=resolved_amount,
            submitted_date=resolved_date,
            file_count=file_count,
            tracking_url=tracking_url,
        )

        whatsapp_text = render_claim_received_whatsapp(
            patient_name=resolved_name,
            claim_id=claim_id,
            hospital_name=resolved_hospital,
            claim_amount=resolved_amount,
            tracking_url=tracking_url,
        )

        email_sent = False
        whatsapp_sent = False

        # 1. Send Email
        if email:
            try:
                email_sent = self.email_driver.send_email(
                    to_email=email,
                    subject=email_data["subject"],
                    html_body=email_data["html"],
                    plain_text=email_data["plain_text"],
                )
                if not email_sent and self.email_driver is not self.mock_driver:
                    self.mock_driver.send_email(
                        to_email=email,
                        subject=email_data["subject"],
                        html_body=email_data["html"],
                        plain_text=email_data["plain_text"],
                    )
            except Exception as exc:
                logger.exception(f"Claim intake email failed for claim {claim_id}: {exc}")

        # 2. Send WhatsApp
        if phone:
            try:
                whatsapp_sent = self.whatsapp_driver.send_whatsapp_message(
                    to_phone=phone,
                    message_text=whatsapp_text,
                )
                if not whatsapp_sent and self.whatsapp_driver is not self.mock_driver:
                    self.mock_driver.send_whatsapp_message(
                        to_phone=phone,
                        message_text=whatsapp_text,
                    )
            except Exception as exc:
                logger.exception(f"Claim intake WhatsApp failed for claim {claim_id}: {exc}")

        return {
            "event": "CLAIM_INTAKE",
            "claim_id": claim_id,
            "email": email,
            "phone": phone,
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
        }

    def send_claim_processed_notification(
        self,
        claim_id: str,
        email: str | None = None,
        phone: str | None = None,
        patient_name: str | None = None,
        hospital_name: str | None = None,
        claim_amount: str | float | None = None,
        diagnosis: str | None = None,
        icd_codes: list[str] | None = None,
        risk_score: str | float | None = None,
        admission_date: str | None = None,
        discharge_date: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
        base_url: str | None = None,
    ) -> dict[str, Any]:
        """Dispatch post-adjudication completion notification with attached TPA and IRDAI reports."""
        resolved_name = (patient_name or "Patient").strip()
        resolved_hospital = (hospital_name or "Treating Healthcare Provider").strip()
        
        if claim_amount:
            try:
                num_amt = float(str(claim_amount).replace(",", "").replace("₹", "").strip())
                resolved_amount = f"₹{num_amt:,.2f}"
            except Exception:
                resolved_amount = f"₹{claim_amount}"
        else:
            resolved_amount = "₹0.00"

        report_url = f"{self._get_base_url(base_url)}/app?claim_id={claim_id}"

        has_tpa = any("tpa" in (a.get("name") or "").lower() for a in (attachments or []))
        has_irda = any("irda" in (a.get("name") or "").lower() for a in (attachments or []))

        email_data = render_claim_processed_email(
            patient_name=resolved_name,
            claim_id=claim_id,
            hospital_name=resolved_hospital,
            claim_amount=resolved_amount,
            diagnosis=diagnosis,
            icd_codes=icd_codes,
            risk_score=risk_score,
            admission_date=admission_date,
            discharge_date=discharge_date,
            report_url=report_url,
            has_tpa_pdf=has_tpa,
            has_irda_pdf=has_irda,
        )

        whatsapp_text = render_claim_processed_whatsapp(
            patient_name=resolved_name,
            claim_id=claim_id,
            hospital_name=resolved_hospital,
            claim_amount=resolved_amount,
            diagnosis=diagnosis,
            report_url=report_url,
        )

        email_sent = False
        whatsapp_sent = False

        # 1. Send Email with attached reports
        if email:
            try:
                email_sent = self.email_driver.send_email(
                    to_email=email,
                    subject=email_data["subject"],
                    html_body=email_data["html"],
                    plain_text=email_data["plain_text"],
                    attachments=attachments,
                )
                if not email_sent and self.email_driver is not self.mock_driver:
                    self.mock_driver.send_email(
                        to_email=email,
                        subject=email_data["subject"],
                        html_body=email_data["html"],
                        plain_text=email_data["plain_text"],
                        attachments=attachments,
                    )
            except Exception as exc:
                logger.exception(f"Claim processed email failed for claim {claim_id}: {exc}")

        # 2. Send WhatsApp
        if phone:
            try:
                whatsapp_sent = self.whatsapp_driver.send_whatsapp_message(
                    to_phone=phone,
                    message_text=whatsapp_text,
                )
                if not whatsapp_sent and self.whatsapp_driver is not self.mock_driver:
                    self.mock_driver.send_whatsapp_message(
                        to_phone=phone,
                        message_text=whatsapp_text,
                    )
            except Exception as exc:
                logger.exception(f"Claim processed WhatsApp failed for claim {claim_id}: {exc}")

        return {
            "event": "CLAIM_PROCESSED",
            "claim_id": claim_id,
            "email": email,
            "phone": phone,
            "attachments_count": len(attachments or []),
            "email_sent": email_sent,
            "whatsapp_sent": whatsapp_sent,
        }


# Global singleton instance for easy import
notification_service = NotificationService()

