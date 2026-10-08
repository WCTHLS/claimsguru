import os
from azure.communication.email import EmailClient

conn_str = os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING", "")
sender = os.getenv("AZURE_COMMUNICATION_SENDER_EMAIL", "DoNotReply@claimsguru.com")
recipient = "swagathreddykasula@gmail.com"

print(f"Connecting to EmailClient with sender: {sender}...")
client = EmailClient.from_connection_string(conn_str)

message = {
    "senderAddress": sender,
    "recipients": {
        "to": [{"address": recipient}],
    },
    "content": {
        "subject": "ClaimsGuru Pre-Prod Email Test 🚀",
        "plainText": "Hello Swagath! Azure Communication Services email delivery is working properly in ClaimsGuru Pre-Prod.",
        "html": "<html><body><h2>ClaimsGuru Pre-Prod Live Verification</h2><p>Hello Swagath,<br>Azure Communication Services email delivery is fully verified and connected!</p></body></html>",
    },
}

poller = client.begin_send(message)
result = poller.result()
print(f"[SUCCESS] Email sent successfully! Message ID: {result}")
