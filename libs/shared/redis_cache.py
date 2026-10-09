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
