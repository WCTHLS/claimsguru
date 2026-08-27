import os
import sys
from dotenv import load_dotenv

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

print("Checking Celery Configuration...")
from libs.shared.celery_app import celery_app

print(f"Broker URL: {celery_app.conf.broker_url}")
print(f"Result Backend URL: {celery_app.conf.result_backend}")

# Verify that the broker URL parses as Azure Service Bus transport if AZURE_SERVICEBUS_CONNECTION_STRING is present
servicebus_conn = os.getenv("AZURE_SERVICEBUS_CONNECTION_STRING")
if servicebus_conn:
    if celery_app.conf.broker_url.startswith("azureservicebus://"):
        print("[SUCCESS] Celery broker successfully parsed the Azure Service Bus connection string!")
    else:
        print("[ERROR] Celery broker failed to parse the Azure Service Bus connection string.")
        sys.exit(1)
else:
    print("[INFO] AZURE_SERVICEBUS_CONNECTION_STRING is not set in your .env file.")

# Test connecting to the broker to verify credentials and connection transport
print("\nTesting connection to the broker...")
try:
    with celery_app.connection() as conn:
        conn.connect()
        print("[SUCCESS] Handshake with message broker was successful! Connection established.")
except Exception as e:
    print(f"[ERROR] Failed to establish handshake with message broker: {e}")
    sys.exit(1)
