import os
from azure.communication.email import EmailClient
from libs.shared.notifications.templates import render_claim_processed_email

conn_str = os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING", "")
sender = os.getenv("AZURE_COMMUNICATION_SENDER_EMAIL", "DoNotReply@claimsguru.com")
recipient = "swagathreddykasula@gmail.com"

rendered = render_claim_processed_email(
    patient_name="Rekha Mishra",
    claim_id="3ae66feb-5e77-46dc-ba76-34903e72b274",
    hospital_name="Care Trauma & Emergency Centre",
    claim_amount="₹40,854.39",
    diagnosis="Ectopic Pregnancy",
    icd_codes=["O00.1", "E03.9"],
    risk_score="14%",
    admission_date="11/04/2024",
    discharge_date="14/04/2024",
    report_url="https://cg-preprod-cin-frontend.purpleocean-4441f644.centralindia.azurecontainerapps.io/app?claim_id=3ae66feb-5e77-46dc-ba76-34903e72b274",
)

print(f"Sending redesigned email to {recipient}...")
client = EmailClient.from_connection_string(conn_str)

message = {
    "senderAddress": sender,
    "recipients": {
        "to": [{"address": recipient}],
    },
    "content": {
        "subject": rendered["subject"],
        "plainText": rendered["plain_text"],
        "html": rendered["html"],
    },
}

poller = client.begin_send(message)
result = poller.result()
print(f"[SUCCESS] Redesigned email sent! Message ID: {result}")
