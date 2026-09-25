#!/usr/bin/env python3
"""
ClaimsGuru Production User Provisioning Script.

Provisions an administrative or organizational user into:
1. Microsoft Entra External ID (CIAM) customer tenant as a local account (via Microsoft Graph API)
2. ClaimsGuru Application Database (users, organizations, roles, staff_profiles, user_roles)

Usage:
    python scripts/provision_user.py \\
        --email user@example.com \\
        --password "TemporaryPassword123!" \\
        --first-name John \\
        --last-name Doe \\
        --insurance-company "ABC Insurance" \\
        --role admin

Designed to run locally or as a scheduled / on-demand Azure Container Apps Job in production.
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Attempt to load dotenv if available
try:
    from dotenv import load_dotenv
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_file = os.path.join(root_dir, ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
except ImportError:
    pass

import requests
from sqlalchemy import create_engine, inspect, text


# ============================================================
# Constants & Defaults
# ============================================================

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

ALLOWED_ROLES = {
    "admin",
    "reviewer",
    "submitter",
    "tpa",
    "viewer",
}


# ============================================================
# Argument Parsing
# ============================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="Provision ClaimsGuru user in Microsoft Entra External ID and application database."
    )

    parser.add_argument(
        "--email",
        required=True,
        help="User email address (login username for Entra External ID and ClaimsGuru DB)",
    )
    parser.add_argument(
        "--password",
        required=True,
        help="Password for Entra External ID account",
    )
    parser.add_argument(
        "--first-name",
        required=True,
        help="User given / first name",
    )
    parser.add_argument(
        "--last-name",
        required=True,
        help="User surname / last name",
    )
    parser.add_argument(
        "--insurance-company",
        required=True,
        help="Insurance company or organization name (e.g. 'Star Health', 'Care Health')",
    )
    parser.add_argument(
        "--role",
        default="admin",
        choices=sorted(ALLOWED_ROLES),
        help="Application role to assign (default: 'admin')",
    )
    parser.add_argument(
        "--org-type",
        default="INSURER",
        help="Organization type if newly created ('INSURER', 'TPA', 'HOSPITAL'; default: 'INSURER')",
    )
    parser.add_argument(
        "--designation",
        default="Organization Administrator",
        help="Staff member designation / title (default: 'Organization Administrator')",
    )
    parser.add_argument(
        "--employee-id",
        default=None,
        help="Employee ID for staff profile (optional, auto-generated if omitted)",
    )
    parser.add_argument(
        "--phone",
        default=None,
        help="User phone number (optional)",
    )
    parser.add_argument(
        "--issuer",
        default=None,
        help="Override for Entra External ID issuer domain (e.g. 'claimsguru.onmicrosoft.com')",
    )
    parser.add_argument(
        "--force-password-change",
        action="store_true",
        default=False,
        help="Force user to change password on next sign-in (default: False)",
    )

    return parser.parse_args()


# ============================================================
# Environment Helpers
# ============================================================

def get_env_var(name: str, fallback_names: list[str] | None = None, default: str | None = None) -> str:
    """Retrieve environment variable supporting multiple alias names."""
    names = [name] + (fallback_names or [])
    for n in names:
        val = os.getenv(n)
        if val is not None and str(val).strip() != "":
            return str(val).strip()
    if default is not None:
        return default
    raise RuntimeError(
        f"Missing required environment variable '{name}'. "
        f"(Checked aliases: {', '.join(names)})"
    )


# ============================================================
# Microsoft Graph Authentication
# ============================================================

def get_graph_access_token() -> str:
    """
    Acquire Microsoft Graph access token using OAuth 2.0 Client Credentials flow.
    Belongs to backend provisioning service principal with 'User.ReadWrite.All'.
    """
    tenant_id = get_env_var(
        "ENTRA_TENANT_ID",
        fallback_names=["EXPO_PUBLIC_ENTRA_TENANT_ID", "NEXT_PUBLIC_ENTRA_TENANT_ID"],
    )
    client_id = get_env_var(
        "ENTRA_PROVISIONING_CLIENT_ID",
        fallback_names=[
            "PROVISIONING_ENTRA_CLIENT_ID",
            "PROVISIONIG_ENTRA_CLIENT_ID",
            "ENTRA_CLIENT_ID",
        ],
    )
    client_secret = get_env_var(
        "ENTRA_PROVISIONING_CLIENT_SECRET",
        fallback_names=[
            "PROVISIONING_ENTRA_CLIENT_SECRET",
            "PROVISIONIG_ENTRA_CLIENT_SECRET",
            "ENTRA_CLIENT_SECRET",
        ],
    )

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    response = requests.post(
        token_url,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        },
        timeout=30,
    )

    if not response.ok:
        print(f"[-] Token acquisition failed: {response.status_code} - {response.text}", file=sys.stderr)
        response.raise_for_status()

    return response.json()["access_token"]


# ============================================================
# Entra External ID User Provisioning
# ============================================================

def find_existing_entra_user(access_token: str, email: str) -> Optional[dict]:
    """Find an existing user in Entra by email address."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    # 1. Search by mail attribute
    try:
        res = requests.get(
            f"{GRAPH_BASE_URL}/users",
            params={
                "$filter": f"mail eq '{email}'",
                "$select": "id,displayName,mail,userPrincipalName",
            },
            headers=headers,
            timeout=20,
        )
        if res.ok:
            data = res.json().get("value", [])
            for u in data:
                if str(u.get("mail", "")).lower() == email.lower():
                    return u
    except Exception:
        pass

    # 2. Search all users and check mail / identities in beta if necessary
    try:
        res = requests.get(
            f"{GRAPH_BASE_URL}/users?$select=id,displayName,mail,userPrincipalName&$top=999",
            headers=headers,
            timeout=20,
        )
        if res.ok:
            data = res.json().get("value", [])
            for u in data:
                if str(u.get("mail", "")).lower() == email.lower():
                    return u
    except Exception:
        pass

    return None


def create_or_get_entra_user(
    access_token: str,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    issuer_override: Optional[str] = None,
    force_change_password: bool = False,
) -> dict:
    """
    Creates an Entra External ID Customer Local Account using Graph API.
    Does NOT require email OTP or verification codes when created via Graph application permissions.
    """
    subdomain = get_env_var(
        "ENTRA_SUBDOMAIN",
        fallback_names=["EXPO_PUBLIC_ENTRA_SUBDOMAIN", "NEXT_PUBLIC_ENTRA_SUBDOMAIN"],
        default="claimsguru",
    )

    if issuer_override:
        issuer = issuer_override
    else:
        issuer = get_env_var(
            "ENTRA_EXTERNAL_ID_ISSUER",
            fallback_names=["ENTRA_ISSUER_DOMAIN"],
            default=f"{subdomain}.onmicrosoft.com",
        )

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    clean_email = email.strip().lower()
    full_name = f"{first_name} {last_name}".strip() or clean_email
    mail_nickname = clean_email.split("@")[0].replace("+", "_").replace(".", "_")

    payload = {
        "accountEnabled": True,
        "displayName": full_name,
        "givenName": first_name.strip(),
        "surname": last_name.strip(),
        "mail": clean_email,
        "mailNickname": mail_nickname,
        "identities": [
            {
                "signInType": "emailAddress",
                "issuer": issuer,
                "issuerAssignedId": clean_email,
            }
        ],
        "passwordProfile": {
            "password": password,
            "forceChangePasswordNextSignIn": force_change_password,
        },
        "passwordPolicies": "DisablePasswordExpiration",
    }

    response = requests.post(
        f"{GRAPH_BASE_URL}/users",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if response.status_code == 201:
        return response.json()

    # If user already exists (409 Conflict or 400 with duplicate message)
    if response.status_code in (400, 409):
        err_text = response.text
        if "already exists" in err_text.lower() or "ResourceAlreadyExists" in err_text:
            print(f"[*] User '{clean_email}' already exists in Entra External ID. Fetching existing account...")
            existing = find_existing_entra_user(access_token, clean_email)
            if existing:
                print(f"[*] Found existing Entra Object ID: {existing['id']}")
                return existing

    print("[-] ERROR: Microsoft Graph user creation failed", file=sys.stderr)
    print(f"    Status: {response.status_code}", file=sys.stderr)
    print(f"    Body:   {response.text}", file=sys.stderr)
    response.raise_for_status()
    return {}


# ============================================================
# Database Provisioning
# ============================================================

def create_or_update_db_user(
    *,
    email: str,
    first_name: str,
    last_name: str,
    insurance_company: str,
    role: str = "admin",
    external_subject_id: str,
    org_type: str = "INSURER",
    designation: str = "Organization Administrator",
    employee_id: Optional[str] = None,
    phone: Optional[str] = None,
) -> uuid.UUID:
    """
    Provisions or synchronizes the user into ClaimsGuru relational schema:
    1. organizations: ensure insurer/organization exists
    2. roles: ensure requested role ('admin', etc.) exists
    3. users: create/update user linked to entra provider and external_subject_id
    4. user_roles: assign role to user
    5. staff_profiles: link user to organization profile
    """
    clean_email = email.strip().lower()
    clean_company = insurance_company.strip()
    clean_role = role.strip().lower()

    database_url = get_env_var("DATABASE_URL")
    engine = create_engine(database_url, pool_pre_ping=True)

    with engine.begin() as conn:
        # ----------------------------------------------------
        # 1. Organization lookup or insertion
        # ----------------------------------------------------
        org_row = conn.execute(
            text("SELECT id, name FROM organizations WHERE lower(name) = lower(:name)"),
            {"name": clean_company},
        ).mappings().first()

        if org_row:
            org_id = org_row["id"]
            print(f"    ✓ Found existing organization: '{org_row['name']}' (ID: {org_id})")
        else:
            org_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO organizations (id, name, type, status, created_at, updated_at)
                    VALUES (:id, :name, :type, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {"id": org_id, "name": clean_company, "type": org_type},
            )
            print(f"    ✓ Created organization: '{clean_company}' (ID: {org_id}, Type: {org_type})")

        # ----------------------------------------------------
        # 2. Role lookup or insertion
        # ----------------------------------------------------
        role_row = conn.execute(
            text("SELECT id, name FROM roles WHERE lower(name) = lower(:name)"),
            {"name": clean_role},
        ).mappings().first()

        if role_row:
            role_id = role_row["id"]
            print(f"    ✓ Found role: '{role_row['name']}' (ID: {role_id})")
        else:
            role_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO roles (id, name, description, created_at)
                    VALUES (:id, :name, :desc, CURRENT_TIMESTAMP)
                """),
                {"id": role_id, "name": clean_role, "desc": f"{clean_role.title()} Access Role"},
            )
            print(f"    ✓ Created role: '{clean_role}' (ID: {role_id})")

        # ----------------------------------------------------
        # 3. User lookup, creation or update
        # ----------------------------------------------------
        user_row = conn.execute(
            text("""
                SELECT id, email, status FROM users
                WHERE lower(email) = lower(:email)
                   OR (external_provider = 'entra' AND external_subject_id = :subject_id)
            """),
            {"email": clean_email, "subject_id": external_subject_id},
        ).mappings().first()

        if user_row:
            user_id = user_row["id"]
            conn.execute(
                text("""
                    UPDATE users
                    SET external_provider = 'entra',
                        external_subject_id = :subject_id,
                        status = 'ACTIVE',
                        email_verified = 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {"id": user_id, "subject_id": external_subject_id},
            )
            print(f"    ✓ Synchronized existing user: '{clean_email}' (ID: {user_id})")
        else:
            # Map canonical user ID directly to Entra Object ID if it's a valid UUID
            try:
                user_id = uuid.UUID(str(external_subject_id))
            except Exception:
                user_id = uuid.uuid4()

            conn.execute(
                text("""
                    INSERT INTO users (
                        id, email, phone, external_provider, external_subject_id,
                        status, email_verified, created_at, updated_at
                    )
                    VALUES (
                        :id, :email, :phone, 'entra', :subject_id,
                        'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """),
                {
                    "id": user_id,
                    "email": clean_email,
                    "phone": phone,
                    "subject_id": external_subject_id,
                },
            )
            print(f"    ✓ Created new DB user: '{clean_email}' (ID: {user_id})")

        # ----------------------------------------------------
        # 4. Role assignment (user_roles)
        # ----------------------------------------------------
        user_role_row = conn.execute(
            text("SELECT id FROM user_roles WHERE user_id = :user_id AND role_id = :role_id"),
            {"user_id": user_id, "role_id": role_id},
        ).mappings().first()

        if not user_role_row:
            conn.execute(
                text("""
                    INSERT INTO user_roles (id, user_id, role_id, created_at)
                    VALUES (:id, :user_id, :role_id, CURRENT_TIMESTAMP)
                """),
                {"id": uuid.uuid4(), "user_id": user_id, "role_id": role_id},
            )
            print(f"    ✓ Assigned role '{clean_role}' to user '{clean_email}'")
        else:
            print(f"    ✓ User already has role '{clean_role}'")

        # ----------------------------------------------------
        # 5. Staff Profile synchronization
        # ----------------------------------------------------
        staff_row = conn.execute(
            text("SELECT id FROM staff_profiles WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).mappings().first()

        emp_code = employee_id or f"EMP-{str(uuid.uuid4())[:8].upper()}"

        if staff_row:
            conn.execute(
                text("""
                    UPDATE staff_profiles
                    SET organization_id = :org_id,
                        first_name = :first_name,
                        last_name = :last_name,
                        designation = :designation,
                        status = 'ACTIVE',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                """),
                {
                    "user_id": user_id,
                    "org_id": org_id,
                    "first_name": first_name.strip(),
                    "last_name": last_name.strip(),
                    "designation": designation,
                },
            )
            print(f"    ✓ Updated staff profile for '{clean_email}'")
        else:
            conn.execute(
                text("""
                    INSERT INTO staff_profiles (
                        id, user_id, organization_id, first_name, last_name,
                        employee_id, designation, department, status,
                        created_at, updated_at
                    )
                    VALUES (
                        :id, :user_id, :org_id, :first_name, :last_name,
                        :employee_id, :designation, 'Operations', 'ACTIVE',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """),
                {
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "org_id": org_id,
                    "first_name": first_name.strip(),
                    "last_name": last_name.strip(),
                    "employee_id": emp_code,
                    "designation": designation,
                },
            )
            print(f"    ✓ Created staff profile linking '{clean_email}' to '{clean_company}'")

    return user_id


# ============================================================
# Main Entrypoint
# ============================================================

def main():
    args = parse_args()

    clean_email = args.email.strip().lower()
    print("\n=======================================================")
    print(" ClaimsGuru Production User Provisioning")
    print("=======================================================")
    print(f"Target Email:       {clean_email}")
    print(f"Target Name:        {args.first_name} {args.last_name}")
    print(f"Insurance Company:  {args.insurance_company}")
    print(f"Assigned Role:      {args.role}")
    print("=======================================================\n")

    # Step 1: Microsoft Graph Authentication
    print("[1/3] Authenticating with Microsoft Graph...")
    try:
        access_token = get_graph_access_token()
        print("    ✓ Successfully acquired Microsoft Graph bearer token.")
    except Exception as exc:
        print(f"[-] Microsoft Graph authentication failed: {exc}", file=sys.stderr)
        sys.exit(1)

    # Step 2: Entra External ID User Creation
    print("\n[2/3] Provisioning user in Microsoft Entra External ID (Customer Local Account)...")
    entra_user: Optional[dict] = None
    try:
        entra_user = create_or_get_entra_user(
            access_token=access_token,
            email=clean_email,
            password=args.password,
            first_name=args.first_name,
            last_name=args.last_name,
            issuer_override=args.issuer,
            force_change_password=args.force_password_change,
        )
        entra_user_id = entra_user.get("id")
        user_principal_name = entra_user.get("userPrincipalName", "N/A")

        print(f"    ✓ Entra User Object ID: {entra_user_id}")
        print(f"    ✓ UserPrincipalName:    {user_principal_name}")
    except Exception as exc:
        print(f"[-] Failed to provision user in Microsoft Entra External ID: {exc}", file=sys.stderr)
        sys.exit(2)

    # Step 3: Application Database Record Creation
    print("\n[3/3] Synchronizing user and organization in ClaimsGuru database...")
    try:
        db_user_id = create_or_update_db_user(
            email=clean_email,
            first_name=args.first_name,
            last_name=args.last_name,
            insurance_company=args.insurance_company,
            role=args.role,
            external_subject_id=entra_user_id,
            org_type=args.org_type,
            designation=args.designation,
            employee_id=args.employee_id,
            phone=args.phone,
        )
        print(f"    ✓ Application User ID: {db_user_id}")
    except Exception as exc:
        print(f"[-] Database provisioning failed: {exc}", file=sys.stderr)
        print(f"    Note: Entra account was already created with Object ID '{entra_user_id}'.", file=sys.stderr)
        sys.exit(3)

    print("\n=======================================================")
    print(" ✓ USER PROVISIONING COMPLETED SUCCESSFULLY")
    print("=======================================================")
    print(f" Email:               {clean_email}")
    print(f" Entra Object ID:     {entra_user_id}")
    print(f" ClaimsGuru User ID:  {db_user_id}")
    print(f" Insurance Company:   {args.insurance_company}")
    print(f" Role:                {args.role}")
    print(f" Status:              ACTIVE")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
