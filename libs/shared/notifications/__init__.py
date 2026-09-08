"""ClaimsGuru Enterprise Notification Subsystem."""

from .drivers import (
    AzureCommunicationEmailDriver,
    AzureCommunicationMessagesDriver,
    BaseEmailDriver,
    BaseWhatsAppDriver,
    ConsoleMockDriver,
)
from .service import NotificationService, notification_service
from .templates import (
    render_claim_processed_email,
    render_claim_processed_whatsapp,
    render_claim_received_email,
    render_claim_received_whatsapp,
    render_welcome_email,
    render_welcome_whatsapp,
)

__all__ = [
    "BaseEmailDriver",
    "BaseWhatsAppDriver",
    "ConsoleMockDriver",
    "AzureCommunicationEmailDriver",
    "AzureCommunicationMessagesDriver",
    "NotificationService",
    "notification_service",
    "render_welcome_email",
    "render_welcome_whatsapp",
    "render_claim_received_email",
    "render_claim_received_whatsapp",
    "render_claim_processed_email",
    "render_claim_processed_whatsapp",
]

