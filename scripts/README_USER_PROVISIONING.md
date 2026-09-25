# ClaimsGuru User Provisioning (Microsoft Entra External ID + DB)

This guide documents the user provisioning process for ClaimsGuru, creating administrative and organizational users in both **Microsoft Entra External ID (CIAM)** and the **ClaimsGuru relational database**.

---

## 1. Overview & Key Characteristics

- **No Email Verification / OTP Required**: Direct creation via the Microsoft Graph API using application credentials (`User.ReadWrite.All`) creates the user account immediately with `accountEnabled: true` and the specified password. The user is ready to sign in immediately without any verification emails or OTP prompts.
- **Entra External ID (CIAM) Local Account Specification**: The script targets the Customer Local Account Graph API schema using the `identities` collection with `signInType: "emailAddress"` and issuer domain `<subdomain>.onmicrosoft.com` (e.g. `claimsguru.onmicrosoft.com`).
- **Database Schema Alignment**:
  - Automatically provisions or matches the **Organization** (`organizations` table) with type `INSURER` or `TPA`.
  - Automatically provisions or matches the **Role** (`roles` table, defaulting to `admin`).
  - Sets up the **User** record (`users` table) linking `external_provider = 'entra'` and `external_subject_id = <entra_object_id>`.
  - Links the user in `user_roles` (`user_id`, `role_id`).
  - Creates or updates the **Staff Profile** (`staff_profiles` table) linking `user_id` to `organization_id`.
  - Idempotent: Re-running for an existing user updates and synchronizes DB records without errors.

---

## 2. Environment Variables

The script looks for the following environment variables (defined in `.env` locally or in Azure Container App / Job secret configuration):

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `ENTRA_TENANT_ID` | Directory (Tenant) ID for Entra External ID | `25677056-693e-49e6-b2e1-03b7ff8db968` |
| `ENTRA_PROVISIONING_CLIENT_ID` | Application (Client) ID of App Registration with `User.ReadWrite.All` | `a8f6345e-0a65-433e-aa0a-ded94e8cf696` |
| `ENTRA_PROVISIONING_CLIENT_SECRET` | Client Secret for backend provisioning application | `GM28Q~...` |
| `ENTRA_SUBDOMAIN` | Subdomain for your CIAM tenant | `claimsguru` |
| `ENTRA_EXTERNAL_ID_ISSUER` | Issuer domain (optional; inferred from subdomain) | `claimsguru.onmicrosoft.com` |
| `DATABASE_URL` | SQLAlchemy connection string to ClaimsGuru DB | `mssql+pymssql://...` or `postgresql+psycopg2://...` |

> [!NOTE]
> The script also accepts aliases such as `PROVISIONIG_ENTRA_CLIENT_ID` and `PROVISIONIG_ENTRA_CLIENT_SECRET` present in existing `.env` files.

---

## 3. Local Execution

```bash
python scripts/provision_user.py \
    --email "admin@starhealth.in" \
    --password "StrongPassword123!" \
    --first-name "Star" \
    --last-name "Admin" \
    --insurance-company "Star Health" \
    --role "admin"
```

### Optional Arguments

- `--role`: Role to assign: `admin` (default), `reviewer`, `submitter`, `tpa`, `viewer`.
- `--org-type`: Organization type: `INSURER` (default), `TPA`, `HOSPITAL`.
- `--designation`: Staff designation (default: `Organization Administrator`).
- `--employee-id`: Custom employee ID (auto-generated if omitted).
- `--phone`: User phone number.
- `--force-password-change`: If passed, forces user to set a new password on their first login.

---

## 4. Production: Azure Container Job Setup

You can execute this script in production using an **Azure Container Apps Job** on demand.

### Step 1: Create the Azure Container Apps Job

```bash
az containerapp job create \
    --name "claimsguru-provision-user-job" \
    --resource-group "<YOUR_RESOURCE_GROUP>" \
    --environment "<YOUR_CONTAINER_APPS_ENVIRONMENT>" \
    --trigger-type "Manual" \
    --replica-timeout 600 \
    --replica-retry-limit 1 \
    --image "<YOUR_ACR_NAME>.azurecr.io/claimsguru-core:latest" \
    --secrets \
        database-url="<YOUR_AZURE_SQL_OR_PG_CONN_STRING>" \
        entra-client-secret="<YOUR_ENTRA_CLIENT_SECRET>" \
    --env-vars \
        DATABASE_URL=secretref:database-url \
        ENTRA_TENANT_ID="25677056-693e-49e6-b2e1-03b7ff8db968" \
        ENTRA_PROVISIONING_CLIENT_ID="a8f6345e-0a65-433e-aa0a-ded94e8cf696" \
        ENTRA_PROVISIONING_CLIENT_SECRET=secretref:entra-client-secret \
        ENTRA_SUBDOMAIN="claimsguru" \
        ENTRA_EXTERNAL_ID_ISSUER="claimsguru.onmicrosoft.com"
```

### Step 2: Trigger Job with User Parameters

Whenever you need to provision a new user, start a job execution overriding the container command line arguments:

```bash
az containerapp job execution start \
    --name "claimsguru-provision-user-job" \
    --resource-group "<YOUR_RESOURCE_GROUP>" \
    --command "python" \
    --args "scripts/provision_user.py" \
           "--email" "user@insurance.com" \
           "--password" "TempPassword2026!" \
           "--first-name" "John" \
           "--last-name" "Doe" \
           "--insurance-company" "Star Health" \
           "--role" "admin"
```

### Step 3: Monitor Execution Logs

```bash
az containerapp job execution list \
    --name "claimsguru-provision-user-job" \
    --resource-group "<YOUR_RESOURCE_GROUP>" \
    --output table

# View execution logs
az containerapp job execution show \
    --name "claimsguru-provision-user-job" \
    --resource-group "<YOUR_RESOURCE_GROUP>" \
    --job-execution-name "<EXECUTION_NAME>"
```
