import time
import logging
import math
from typing import Optional
import redis.asyncio as aioredis
from fastapi import Request, Response, HTTPException
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from .config import settings

logger = logging.getLogger("ingress.rate_limiter")

# Lua script for atomic sliding window rate limiting
# ZREM old items, check ZCARD, ZADD new item, set EXPIRE
LUA_SLIDING_WINDOW = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clear_before = now - window_ms

-- Remove old request timestamps outside the window
redis.call('zremrangebyscore', key, 0, clear_before)

-- Count requests in current window
local current_requests = redis.call('zcard', key)

if current_requests < limit then
    -- Add current request timestamp (using score and member as timestamp)
    redis.call('zadd', key, now, now)
    -- Set TTL to ensure key is cleaned up if idle
    redis.call('expire', key, math.ceil(window_ms / 1000))
    return -1 -- Success: Not rate limited
else
    -- Return milliseconds remaining until the oldest request falls out of the window
    local oldest = redis.call('zrange', key, 0, 0, 'WITHSCORES')
    if oldest[2] then
        local oldest_ts = tonumber(oldest[2])
        return oldest_ts + window_ms - now
    else
        return window_ms
    end
end
"""

class RedisRateLimiterManager:
    """Manages the lifecycle of the async Redis client for rate limiting."""
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.pool: Optional[aioredis.ConnectionPool] = None
        self.client: Optional[aioredis.Redis] = None
        self.script = None

    def init_redis(self):
        if not self.pool:
            logger.info(f"Initializing Redis connection pool for rate limiter with URL: {self.redis_url}")
            self.pool = aioredis.ConnectionPool.from_url(
                self.redis_url, 
                max_connections=50, 
                decode_responses=True
            )
            self.client = aioredis.Redis(connection_pool=self.pool)
            self.script = self.client.register_script(LUA_SLIDING_WINDOW)

    async def close(self):
        if self.pool:
            logger.info("Closing Redis connection pool for rate limiter")
            await self.pool.disconnect()
            self.pool = None
            self.client = None
            self.script = None

# Global manager instance
limiter_manager = RedisRateLimiterManager(settings.redis_url)

def get_client_ip(request: Request) -> str:
    """Extract client IP securely supporting reverse proxy headers (X-Forwarded-For)."""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        # First IP in X-Forwarded-For is always the original client
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

class RateLimiter:
    """FastAPI dependency wrapper for applying sliding window rate limits."""
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds

    async def __call__(self, request: Request, response: Response):
        # Lazy initialization of Redis client
        limiter_manager.init_redis()
        client = limiter_manager.client
        script = limiter_manager.script

        if not client or not script:
            # Fallback if Redis is completely unavailable: log error and allow request
            logger.error("Redis rate limiter client is unavailable. Bypassing rate check.")
            return

        client_ip = get_client_ip(request)
        path = request.url.path
        key = f"rate_limit:{path}:{client_ip}"

        # Current time in milliseconds
        now_ms = int(time.time() * 1000)
        window_ms = self.window_seconds * 1000

        try:
            # Execute atomic sliding window script
            res = await script(keys=[key], args=[now_ms, window_ms, self.limit])
            
            # Script returns -1 if allowed, or remaining time in ms if limited
            if res != -1:
                retry_after_secs = max(1, math.ceil(res / 1000))
                logger.warning(
                    f"Rate limit exceeded: path={path} IP={client_ip} "
                    f"limit={self.limit} window={self.window_seconds}s. Retry after {retry_after_secs}s."
                )
                raise HTTPException(
                    status_code=HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Too Many Requests",
                        "message": "API request limit exceeded. Please try again later.",
                        "retry_after": retry_after_secs
                    },
                    headers={
                        "Retry-After": str(retry_after_secs),
                        "X-RateLimit-Limit": str(self.limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(retry_after_secs),
                    }
                )
            
            # If request is allowed, we can optionally add headers to the response
            # Let's count current zcard to know remaining requests
            current_count = await client.zcard(key)
            remaining = max(0, self.limit - current_count)
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            
        except HTTPException:
            raise
        except Exception as e:
            # Log exception and fail-open to avoid breaking the application on Redis transient issues
            logger.exception(f"Unexpected error in rate limiter: {e}")
            return
