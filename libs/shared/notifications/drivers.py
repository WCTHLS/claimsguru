"""Pluggable notification drivers for Azure Communication Services and Dev/Mock."""

import logging
import os
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger("notifications")


class BaseEmailDriver(ABC):
    """Abstract base class for email delivery drivers."""

    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        plain_text: str | None = None,
        sender: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
    ) -> bool:
        """Send an email to a single recipient with optional attachments."""
        pass


class BaseWhatsAppDriver(ABC):
    """Abstract base class for WhatsApp / SMS messaging drivers."""

    @abstractmethod
    def send_whatsapp_message(
        self,
        to_phone: str,
        message_text: str,
    ) -> bool:
        """Send a WhatsApp text message to a recipient phone number."""
        pass


class ConsoleMockDriver(BaseEmailDriver, BaseWhatsAppDriver):
    """Fallback development driver that logs notifications to stdout/logger."""

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        plain_text: str | None = None,
        sender: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
    ) -> bool:
        sender_display = sender or "DoNotReply@claimsguru.azurecomm.net"
        att_info = ""
        if attachments:
            att_names = [a.get("name", "document.pdf") for a in attachments]
            att_info = f"\nAttachments ({len(attachments)}): {', '.join(att_names)}"
        logger.info(
            "\n" + "=" * 70 + "\n"
            f"[MOCK NOTIFICATION: EMAIL SENT]\n"
            f"From    : {sender_display}\n"
            f"To      : {to_email}\n"
            f"Subject : {subject}{att_info}\n"
            f"Text Preview:\n{plain_text or html_body[:200]}...\n"
            + "=" * 70
        )
        return True

    def send_whatsapp_message(
        self,
        to_phone: str,
        message_text: str,
    ) -> bool:
        logger.info(
            "\n" + "=" * 70 + "\n"
            f"[MOCK NOTIFICATION: WHATSAPP SENT]\n"
            f"To      : {to_phone}\n"
            f"Message :\n{message_text}\n"
            + "=" * 70
        )
        return True


class AzureCommunicationEmailDriver(BaseEmailDriver):
    """Native Azure Communication Services Email Driver.
    
    Reads AZURE_COMMUNICATION_CONNECTION_STRING and AZURE_COMMUNICATION_SENDER_EMAIL.
    """

    def __init__(self, connection_string: str | None = None, sender_email: str | None = None):
        self.connection_string = (
            connection_string
            or os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")
            or os.getenv("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING")
            or ""
        ).strip('"' + "'")
        self.sender_email = (
            sender_email
            or os.getenv("AZURE_COMMUNICATION_SENDER_EMAIL")
            or "DoNotReply@claimsguru.azurecomm.net"
        ).strip('"' + "'")

    def is_configured(self) -> bool:
        return bool(self.connection_string and "endpoint=" in self.connection_string.lower())

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        plain_text: str | None = None,
        sender: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
    ) -> bool:
        if not self.is_configured():
            logger.warning("[Azure Email] Connection string not configured; skipping real dispatch.")
            return False

        sender_addr = sender or self.sender_email

        try:
            import base64
            from azure.communication.email import EmailClient

            client = EmailClient.from_connection_string(self.connection_string)
            message: dict[str, Any] = {
                "content": {
                    "subject": subject,
                    "plainText": plain_text or subject,
                    "html": html_body,
                },
                "recipients": {
                    "to": [{"address": to_email}],
                },
                "senderAddress": sender_addr,
            }

            if attachments:
                formatted_attachments = []
                for att in attachments:
                    name = att.get("name", "document.pdf")
                    content_type = att.get("contentType") or att.get("content_type", "application/pdf")
                    b64_content = att.get("contentInBase64")
                    if not b64_content and "data" in att:
                        raw_data = att["data"]
                        if isinstance(raw_data, bytes):
                            b64_content = base64.b64encode(raw_data).decode("utf-8")
                        elif isinstance(raw_data, str):
                            b64_content = base64.b64encode(raw_data.encode("utf-8")).decode("utf-8")
                    if b64_content:
                        formatted_attachments.append({
                            "name": name,
                            "contentType": content_type,
                            "contentInBase64": b64_content,
                        })
                if formatted_attachments:
                    message["attachments"] = formatted_attachments

            poller = client.begin_send(message)
            logger.info(f"[Azure Email] Email queued for {to_email} with {len(attachments or [])} attachments. Poller: {poller}")
            return True
        except ImportError:
            logger.warning("[Azure Email] azure-communication-email SDK not installed. Falling back to Mock.")
            return False
        except Exception as exc:
            logger.exception(f"[Azure Email] Failed to send email to {to_email}: {exc}")
            return False


class AzureCommunicationMessagesDriver(BaseWhatsAppDriver):
    """Native Azure Communication Services Advanced Messaging / SMS Driver."""

    def __init__(self, connection_string: str | None = None, channel_id: str | None = None):
        self.connection_string = (
            connection_string
            or os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")
            or os.getenv("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING")
            or ""
        ).strip('"' + "'")
        self.channel_id = (
            channel_id
            or os.getenv("AZURE_COMMUNICATION_WHATSAPP_CHANNEL_ID")
            or os.getenv("AZURE_COMMUNICATION_PHONE_NUMBER")
            or ""
        ).strip('"' + "'")

    def is_configured(self) -> bool:
        return bool(self.connection_string and "endpoint=" in self.connection_string.lower())

    def send_whatsapp_message(
        self,
        to_phone: str,
        message_text: str,
    ) -> bool:
        if not self.is_configured():
            logger.warning("[Azure Messages] Connection string not configured; skipping dispatch.")
            return False

        clean_phone = to_phone.strip().replace(" ", "").replace("-", "")
        if not clean_phone.startswith("+"):
            if len(clean_phone) == 10:
                clean_phone = f"+91{clean_phone}"
            else:
                clean_phone = f"+{clean_phone}"

        try:
            from azure.communication.messages import NotificationMessagesClient
            from azure.communication.messages.models import TextNotificationContent

            client = NotificationMessagesClient.from_connection_string(self.connection_string)
            content = TextNotificationContent(
                channel_registration_id=self.channel_id,
                to=[clean_phone],
                content=message_text,
            )
            response = client.send(content)
            logger.info(f"[Azure WhatsApp] Message sent to {clean_phone}: {response}")
            return True
        except ImportError:
            try:
                from azure.communication.sms import SmsClient

                sms_client = SmsClient.from_connection_string(self.connection_string)
                sms_response = sms_client.send(
                    from_=self.channel_id,
                    to=[clean_phone],
                    message=message_text[:160],
                )
                logger.info(f"[Azure SMS Fallback] SMS sent to {clean_phone}: {sms_response}")
                return True
            except Exception as e:
                logger.warning(f"[Azure Messaging] Azure SDKs unavailable: {e}")
                return False
        except Exception as exc:
            logger.exception(f"[Azure Messages] Failed to send WhatsApp message to {clean_phone}: {exc}")
            return False
