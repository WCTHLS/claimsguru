import logging
import sys

# High-frequency, verbose third-party loggers that dump HTTP headers,
# connection pool pings, or transport debug frames into Log Analytics
QUIET_LOGGERS = [
    "azure",
    "azure.core.pipeline.policies.http_logging_policy",
    "azure.core.pipeline.policies",
    "azure.core",
    "azure.storage",
    "azure.storage.blob",
    "azure.identity",
    "azure.communication",
    "urllib3",
    "urllib3.connectionpool",
    "urllib3.util.retry",
    "msrest",
    "msrestazure",
    "asyncio",
    "multipart",
    "multipart.multipart",
]

class HealthCheckFilter(logging.Filter):
    """Filter out routine health-check polling (/health) from uvicorn access logs.
    
    Prevents hundreds of thousands of identical 200 OK health check lines
    from polluting Log Analytics and incurring ingestion billing.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        if "GET /health" in msg or "GET /ingress/health" in msg or "GET /metrics" in msg:
            return False
        return True


def configure_enterprise_logging(service_name: str = "app", log_level: str = "INFO") -> logging.Logger:
    """Configure clean, cost-optimized logging across microservices and workers.
    
    Ensures:
    1. Critical application milestones, claims events, and errors are visible at INFO/WARNING/ERROR.
    2. Million-line Azure SDK HTTP header and connection-pool noise is completely suppressed.
    3. Health-check pings from ACA liveness probes are filtered out from access logs.
    """
    resolved_level = getattr(logging, log_level.upper(), logging.INFO)

    # 1. Configure root logging format
    logging.basicConfig(
        level=resolved_level,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        stream=sys.stdout,
        force=False,
    )

    # 2. Silence all noisy third-party libraries
    for name in QUIET_LOGGERS:
        quiet_logger = logging.getLogger(name)
        quiet_logger.setLevel(logging.WARNING)
        quiet_logger.propagate = False

    # 3. Filter routine health-check polling from uvicorn
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.addFilter(HealthCheckFilter())

    # 4. Return service logger
    app_logger = logging.getLogger(service_name)
    app_logger.setLevel(resolved_level)
    return app_logger
