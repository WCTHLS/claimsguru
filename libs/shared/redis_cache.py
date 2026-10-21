from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger("shared.redis_cache")

_redis_client = None
_pool = None


def get_redis_client():
    """Return a shared singleton synchronous Redis client with connection pooling and timeouts."""
    global _redis_client, _pool
    if _redis_client is not None:
        return _redis_client

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    try:
        import redis
        _pool = redis.ConnectionPool.from_url(
            redis_url,
            max_connections=20,
            socket_timeout=1.0,
            socket_connect_timeout=1.0,
            decode_responses=True,
        )
        _redis_client = redis.Redis(connection_pool=_pool)
        logger.info(f"[RedisCache] Initialized Redis connection pool for caching (URL: {redis_url})")
    except Exception as e:
        logger.warning(f"[RedisCache] Failed to initialize Redis client: {e}")
        _redis_client = None

    return _redis_client


def get_claim_progress_cache(claim_id: str | Any) -> dict[str, Any] | None:
    """Retrieve cached claim progress JSON dict if present."""
    if not claim_id:
        return None
    client = get_redis_client()
    if not client:
        return None

    try:
        key = f"claim_progress:{claim_id}"
        val = client.get(key)
        if val:
            return json.loads(val)
    except Exception as e:
        logger.debug(f"[RedisCache] Error reading progress cache for claim {claim_id}: {e}")
    return None


def set_claim_progress_cache(claim_id: str | Any, data: dict[str, Any], ttl: int = 3) -> None:
    """Cache claim progress JSON dict with specified TTL in seconds."""
    if not claim_id or not data:
        return
    client = get_redis_client()
    if not client:
        return

    try:
        key = f"claim_progress:{claim_id}"
        client.setex(key, ttl, json.dumps(data))
    except Exception as e:
        logger.debug(f"[RedisCache] Error setting progress cache for claim {claim_id}: {e}")


def invalidate_claim_progress_cache(claim_id: str | Any) -> None:
    """Evict cached claim progress on state transition so next poll gets fresh state."""
    if not claim_id:
        return
    client = get_redis_client()
    if not client:
        return

    try:
        key = f"claim_progress:{claim_id}"
        client.delete(key)
    except Exception as e:
        logger.debug(f"[RedisCache] Error invalidating progress cache for claim {claim_id}: {e}")


def map_step_progress(current_step: str | None, status: str | None = None) -> tuple[str, int]:
    """Map pipeline step & status to user-facing description and progress percentage."""
    if current_step in ("QUEUED", "PENDING") or status in ("QUEUED", "PENDING"):
        return "In Queue (waiting for worker)", 5
    if current_step in ("STARTING", "OCR_IN_PROGRESS"):
        return "OCR (extracting text)", 20
    if current_step == "OCR_COMPLETED":
        return "OCR complete", 35
    if current_step == "PARSING_IN_PROGRESS":
        return "Parsing (LLM agent reading document)", 55
    if current_step == "PARSING_COMPLETED":
        return "Parsing complete", 70
    if current_step == "CODING_ANALYSIS":
        return "Medical coding (ICD-10 / CPT)", 78
    if current_step == "CODING_COMPLETED":
        return "Coding complete", 82
    if current_step == "RISK_ANALYSIS":
        return "Risk scoring", 86
    if current_step == "RISK_COMPLETED":
        return "Risk assessment complete", 90
    if current_step == "VALIDATION_IN_PROGRESS":
        return "Compliance & policy validation", 94
    if current_step in ("VALIDATION_COMPLETED", "FINISHED", "COMPLETED") or status in ("FINISHED", "COMPLETED"):
        return "Complete", 100
    if current_step in ("FAILED", "PARSE_FAILED") or status in ("FAILED", "PARSE_FAILED"):
        return "Failed", 0
    if current_step == "IDENTITY_MISMATCH" or status == "IDENTITY_MISMATCH":
        return "Identity Mismatch", 0
    return "Processing", 25


def sync_claim_progress_cache(claim_id: str | Any, current_step: str, status: str | None = None, ttl: int = 15) -> None:
    """Publish real-time worker step progress to Redis so Ingress serves 100% of progress checks with 0 DB load."""
    if not claim_id:
        return
    step, percentage = map_step_progress(current_step, status)
    is_failed = (status in ("FAILED", "PARSE_FAILED", "IDENTITY_MISMATCH")) or (current_step in ("FAILED", "PARSE_FAILED", "IDENTITY_MISMATCH"))
    payload = {
        "status": status or ("COMPLETED" if percentage == 100 else "RUNNING"),
        "step": step,
        "percentage": percentage,
        "is_complete": bool(percentage == 100 and not is_failed),
        "error": None,
        "is_stalled": False,
    }
    set_claim_progress_cache(str(claim_id), payload, ttl=ttl)

