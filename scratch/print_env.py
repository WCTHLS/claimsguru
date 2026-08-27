import os
import libs.shared.celery_app as ca
print('BROKER_URL:', repr(ca.broker_url))
print('ENV:', repr(os.environ.get('AZURE_SERVICEBUS_CONNECTION_STRING')))
