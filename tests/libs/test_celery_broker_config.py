import os
import importlib
import pytest
from unittest.mock import patch


def test_celery_broker_servicebus_configuration():
    """Verify Celery app correctly configures Azure Service Bus as broker when enabled."""
    dummy_conn = (
        "Endpoint=sb://cg-preprod-sb-vvekhbufuteq2.servicebus.windows.net/;"
        "SharedAccessKeyName=RootManageSharedAccessKey;"
        "SharedAccessKey=testSecretKey123="
    )
    env_overrides = {
        "CELERY_USE_AZURE_SERVICEBUS": "true",
        "AZURE_SERVICEBUS_CONNECTION_STRING": dummy_conn,
        "REDIS_URL": "redis://cg-preprod-redis:6379/0",
    }
    with patch.dict(os.environ, env_overrides, clear=False):
        import libs.shared.celery_app as celery_module
        importlib.reload(celery_module)
        app = celery_module.celery_app

        # Verify broker URL is converted to Kombu's azureservicebus scheme
        assert app.conf.broker_url == "azureservicebus://RootManageSharedAccessKey:testSecretKey123=@cg-preprod-sb-vvekhbufuteq2"
        # Verify result backend remains Redis (since Service Bus is broker-only)
        assert app.conf.result_backend == "redis://cg-preprod-redis:6379/0"
        # Verify transport options are configured for 5-minute peek lock
        assert app.conf.broker_transport_options.get("peek_lock_seconds") == 300
        assert app.conf.broker_transport_options.get("visibility_timeout") == 300
        assert app.conf.broker_transport_options.get("wait_time_seconds") == 5


def test_celery_broker_redis_fallback():
    """Verify Celery app falls back to Redis when Service Bus is disabled."""
    env_overrides = {
        "CELERY_USE_AZURE_SERVICEBUS": "0",
        "REDIS_URL": "redis://cg-preprod-redis:6379/0",
    }
    with patch.dict(os.environ, env_overrides, clear=False):
        # Remove connection string if present
        os.environ.pop("AZURE_SERVICEBUS_CONNECTION_STRING", None)
        import libs.shared.celery_app as celery_module
        importlib.reload(celery_module)
        app = celery_module.celery_app

        assert app.conf.broker_url == "redis://cg-preprod-redis:6379/0"
        assert app.conf.result_backend == "redis://cg-preprod-redis:6379/0"


def test_celery_kombu_servicebus_connection():
    """Verify Kombu can instantiate an Azure Service Bus Connection with the generated URL."""
    import kombu
    url = "azureservicebus://RootManageSharedAccessKey:testSecretKey123=@cg-preprod-sb-vvekhbufuteq2"
    conn = kombu.Connection(url)
    from kombu.transport.azureservicebus import Transport
    assert isinstance(conn.transport, Transport)
    assert conn.hostname == url
