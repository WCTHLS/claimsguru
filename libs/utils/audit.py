"""
Audit logging utility for HIPAA compliance.

Writes structured audit entries to the audit_logs table.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session
from libs.shared.models import AuditLog

logger = logging.getLogger("audit")

class AuditLogger:
    """Writes audit events to the audit_logs table."""

    def __init__(self, db: Session, service_name: str):
        self._db = db
        self._service = service_name

    def log(
        self,
        action: str,
        claim_id: uuid.UUID | None = None,
        actor: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        log_entry = AuditLog(
            id=uuid.uuid4(),
            claim_id=claim_id,
            actor=actor or self._service,
            action=action,
            audit_metadata=metadata,
            created_at=datetime.now(UTC),
        )
        
        self._db.add(log_entry)
        self._db.flush()

        logger.info(
            "AUDIT [%s] %s claim=%s",
            self._service,
            action,
            claim_id,
        )

