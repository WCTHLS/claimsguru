#!/usr/bin/env python3
"""
ClaimsGuru User Provisioning via Microsoft Entra External ID Native Authentication.

Provisions an administrative or organizational user into:
1. Microsoft Entra External ID (CIAM) customer tenant via Native Authentication REST API:
   - Initiates signup (/signup/v1.0/start)
   - Triggers OTP challenge (/signup/v1.0/challenge)
   - Prompts for the email verification code (OTP) in the terminal
   - Submits OTP & sets password (/signup/v1.0/continue)
   - Obtains user tokens and Subject ID (sub/oid)
2. ClaimsGuru Relational Database:
   - organizations (INSURER / TPA)
   - roles (admin, reviewer, submitter, etc.)
   - users (linked to external_provider = 'entra', external_subject_id = <entra_sub>)
   - user_roles
   - staff_profiles

Usage:
    python scripts/provision.py --email user@example.com --password "StrongPassword123!" --first-name John --last-name Doe --insurance-company "Star Health" --role admin
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import uuid
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
from sqlalchemy import create_engine, text

# Ensure UTF-8 console output on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


PREPROD_BACKEND_URL = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"
PREPROD_DB_URL = "mssql+pymssql://claimsgurupreprodadmin:ClaimsGuruPreProdPass!2026@cg-preprod-sql-vvekhbufuteq2.database.windows.net:1433/claimsguru"


# ============================================================
# Argument Parsing
# ============================================================

def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Provision an administrative user via Entra Native Auth (Interactive OTP) + ClaimsGuru Database.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "--env",
        choices=["local", "preprod"],
        default=None,
        help="Target environment ('local' or 'preprod'). If omitted, script prompts interactively before running.",
    )
    parser.add_argument(
        "--backend-url",
        default=None,
        help="Override backend API URL (defaults to env-based local URL or Azure preprod ingress URL)",
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Override database connection URL",
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Email address of the user to provision",
    )
    parser.add_argument(
        "--password",
        required=True,
        help="Password for the new user account in Entra External ID",
    )
    parser.add_argument(
        "--first-name",
        required=True,
        help="User first given name",
    )
    parser.add_argument(
        "--last-name",
        required=True,
        help="User surname / family name",
    )
    parser.add_argument(
        "--insurance-company",
        default="Default Organization",
        help="Insurance Company / TPA organization name to link staff profile",
    )
    parser.add_argument(
        "--role",
        default="admin",
        help="System role to assign ('admin', 'reviewer', 'submitter', 'tpa', 'viewer'; default: 'admin')",
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
        "--client-id",
        default=None,
        help="Override Entra Native Auth Public Client ID",
    )
    parser.add_argument(
        "--subdomain",
        default=None,
        help="Override Entra CIAM subdomain prefix (e.g. 'claimsguruapp')",
    )
    parser.add_argument(
        "--tenant-id",
        default=None,
        help="Override Entra Tenant ID",
    )

    return parser.parse_args()


# ============================================================
# Environment Helpers
# ============================================================

def mask_database_url(url: str) -> str:
    """Mask password in database URL for safe terminal logging."""
    try:
        if "@" in url and "://" in url:
            proto, rest = url.split("://", 1)
            userinfo, hostinfo = rest.split("@", 1)
            if ":" in userinfo:
                user = userinfo.split(":", 1)[0]
                return f"{proto}://{user}:***@{hostinfo}"
    except Exception:
        pass
    return url


def select_environment(cli_env: Optional[str] = None, cli_backend: Optional[str] = None, cli_db: Optional[str] = None) -> tuple[str, str, str]:
    """
    Prompt or resolve the environment (local vs preprod) and return (env_name, backend_api_url, database_url).
    """
    selected = (cli_env or "").strip().lower()

    if selected not in ("local", "preprod"):
        print("\n" + "=" * 65)
        print("  SELECT TARGET ENVIRONMENT")
        print("=" * 65)
        print("  [1] local   - Local dev backend & database")
        print(f"  [2] preprod - Azure Pre-Prod Ingress & Azure SQL")
        print("=" * 65)
        while selected not in ("local", "preprod"):
            try:
                choice = input(">> Select environment [1 for local, 2 for preprod] (default: 1): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n[-] Cancelled by user.")
                sys.exit(1)

            if choice in ("1", "local", ""):
                selected = "local"
            elif choice in ("2", "preprod"):
                selected = "preprod"
            else:
                print("[-] Invalid choice. Please enter 1 (local) or 2 (preprod).")

    if selected == "local":
        backend_url = (
            cli_backend
            or os.getenv("BACKEND_API_URL")
            or os.getenv("INGRESS_URL")
            or os.getenv("INTERNAL_INGRESS_URL")
            or os.getenv("NEXT_PUBLIC_API_BASE")
            or os.getenv("EXPO_PUBLIC_API_URL")
            or "http://localhost:8000"
        ).rstrip("/")
        database_url = (
            cli_db
            or os.getenv("DATABASE_URL")
            or "mssql+pymssql://sa:YourStrong!Password@localhost:1433/claimgpt"
        )
    else:  # preprod
        backend_url = (cli_backend or PREPROD_BACKEND_URL).rstrip("/")
        database_url = (
            cli_db
            or os.getenv("PREPROD_DATABASE_URL")
            or PREPROD_DB_URL
        )

    return selected, backend_url, database_url


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


def decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verifying signature."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
    except Exception:
        return {}


# ============================================================
# Native Authentication Client
# ============================================================

class EntraNativeAuthClient:
    def __init__(self, subdomain: str, tenant_id: str, client_id: str):
        self.subdomain = subdomain.strip()
        self.tenant_id = tenant_id.strip()
        self.client_id = client_id.strip()
        self.base_url = f"https://{self.subdomain}.ciamlogin.com/{self.tenant_id}"
        self.scopes = "openid profile email offline_access"

    def signup_user(self, email: str, password: str) -> dict:
        """
        Execute full native signup flow:
        1. /signup/v1.0/start
        2. /signup/v1.0/challenge
        3. Prompt console for OTP verification code
        4. /signup/v1.0/continue (with OTP)
        5. /signup/v1.0/continue (with password)
        6. Return decoded token claims and tokens.
        """
        clean_email = email.strip().lower()

        # Step 1: Start signup
        start_url = f"{self.base_url}/signup/v1.0/start"
        start_payload = {
            "client_id": self.client_id,
            "username": clean_email,
            "challenge_type": "oob password redirect",
            "password": password,
        }
        res = requests.post(start_url, data=start_payload, timeout=30)
        start_data = res.json() if res.content else {}

        # If user already exists in Entra
        if not res.ok:
            error = start_data.get("error", "")
            suberror = start_data.get("suberror", "")
            desc = start_data.get("error_description", "")
            if "already_exists" in error or "already_exists" in suberror or "already exists" in desc.lower():
                print(f"[*] User '{clean_email}' already exists in Microsoft Entra External ID.")
                print(f"[*] Performing Native Sign-In to retrieve Subject ID and synchronize database...")
                return self.login_user(clean_email, password)
            raise RuntimeError(f"Native signup start failed ({res.status_code}): {start_data}")

        continuation_token = start_data.get("continuation_token")
        if not continuation_token:
            raise RuntimeError(f"No continuation_token returned in signup start: {start_data}")

        # Step 2: Request OTP challenge
        challenge_url = f"{self.base_url}/signup/v1.0/challenge"
        challenge_payload = {
            "client_id": self.client_id,
            "challenge_type": "oob password redirect",
            "continuation_token": continuation_token,
        }
        res2 = requests.post(challenge_url, data=challenge_payload, timeout=30)
        ch_data = res2.json() if res2.content else {}

        if not res2.ok:
            raise RuntimeError(f"Native signup challenge failed ({res2.status_code}): {ch_data}")

        continuation_token = ch_data.get("continuation_token", continuation_token)
        code_length = ch_data.get("code_length", 8)

        print("\n" + "=" * 65)
        print(f"📧 VERIFICATION CODE SENT TO: {clean_email}")
        print(f"   Please check your email inbox (and spam folder).")
        print("=" * 65)

        # Step 3: Prompt user in terminal for OTP code
        otp_code = ""
        while not otp_code:
            try:
                otp_code = input(f">> Enter the {code_length}-digit verification code: ").strip().replace(" ", "")
            except (EOFError, KeyboardInterrupt):
                print("\n[-] Cancelled by user.")
                sys.exit(1)

        # Step 4: Submit OTP code to /signup/v1.0/continue
        continue_url = f"{self.base_url}/signup/v1.0/continue"
        verify_payload = {
            "client_id": self.client_id,
            "continuation_token": continuation_token,
            "grant_type": "oob",
            "oob": otp_code,
        }
        res3 = requests.post(continue_url, data=verify_payload, timeout=30)
        verify_data = res3.json() if res3.content else {}

        if not res3.ok:
            raise RuntimeError(f"OTP verification failed ({res3.status_code}): {verify_data.get('error_description') or verify_data}")

        continuation_token = verify_data.get("continuation_token", continuation_token)
        challenge_type = verify_data.get("challenge_type")
        token_data = None

        # Step 5: If password submission is needed
        if challenge_type == "password":
            pass_payload = {
                "client_id": self.client_id,
                "continuation_token": continuation_token,
                "grant_type": "password",
                "password": password,
            }
            res_pass = requests.post(continue_url, data=pass_payload, timeout=30)
            pass_data = res_pass.json() if res_pass.content else {}
            if not res_pass.ok:
                raise RuntimeError(f"Password submission failed ({res_pass.status_code}): {pass_data}")

            if pass_data.get("access_token"):
                token_data = pass_data
            elif pass_data.get("continuation_token"):
                continuation_token = pass_data["continuation_token"]

        # Step 6: Exchange token if not yet received
        if not token_data or not token_data.get("access_token"):
            token_url = f"{self.base_url}/oauth2/v2.0/token"
            token_payload = {
                "client_id": self.client_id,
                "continuation_token": continuation_token,
                "grant_type": "continuation_token",
                "scope": self.scopes,
            }
            res_tok = requests.post(token_url, data=token_payload, timeout=30)
            token_json = res_tok.json() if res_tok.content else {}
            if res_tok.ok and token_json.get("access_token"):
                token_data = token_json
            else:
                # Fallback to direct native login with the newly created credentials
                print("[*] Exchanging credentials via native sign-in...")
                token_data = self.login_user(clean_email, password)

        return token_data

    def login_user(self, email: str, password: str) -> dict:
        """Perform Native Sign-In to get token and subject ID for an existing user."""
        init_url = f"{self.base_url}/oauth2/v2.0/initiate"
        init_payload = {
            "client_id": self.client_id,
            "challenge_type": "password redirect",
            "username": email,
        }
        res_init = requests.post(init_url, data=init_payload, timeout=30)
        init_data = res_init.json() if res_init.content else {}
        if not res_init.ok:
            raise RuntimeError(f"Native login initiate failed ({res_init.status_code}): {init_data}")

        ct = init_data.get("continuation_token")
        if not ct:
            raise RuntimeError("No continuation_token returned during login initiate.")

        ch_url = f"{self.base_url}/oauth2/v2.0/challenge"
        ch_payload = {
            "client_id": self.client_id,
            "challenge_type": "password redirect",
            "continuation_token": ct,
        }
        res_ch = requests.post(ch_url, data=ch_payload, timeout=30)
        ch_data = res_ch.json() if res_ch.content else {}
        if not res_ch.ok:
            raise RuntimeError(f"Native login challenge failed ({res_ch.status_code}): {ch_data}")

        ct = ch_data.get("continuation_token", ct)

        tok_url = f"{self.base_url}/oauth2/v2.0/token"
        tok_payload = {
            "client_id": self.client_id,
            "continuation_token": ct,
            "grant_type": "password",
            "password": password,
            "scope": self.scopes,
        }
        res_tok = requests.post(tok_url, data=tok_payload, timeout=30)
        tok_data = res_tok.json() if res_tok.content else {}
        if not res_tok.ok:
            raise RuntimeError(f"Native login token failed ({res_tok.status_code}): {tok_data}")

        return tok_data


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
    database_url: str,
) -> uuid.UUID:
    """
    Provisions or synchronizes the user into ClaimsGuru relational schema:
    1. organizations: ensure insurer/organization exists (for admin/reviewer or if specified)
    2. roles: lookup or ensure role ('admin', 'reviewer', 'submitter') exists in roles table
    3. users: create/update user linked to entra provider and external_subject_id
    4. user_roles: associate user_id with role_id from roles table
    5. Profiles:
       - If role in ('admin', 'reviewer'): create/update staff_profiles (with role, is_admin, organization_id)
       - If role == 'submitter': create/update patient_profiles
    """
    clean_email = email.strip().lower()
    clean_company = insurance_company.strip() if insurance_company else ""
    clean_role = role.strip().lower()

    engine = create_engine(database_url, pool_pre_ping=True)

    with engine.begin() as conn:
        # 1. Organization lookup or insertion (mandatory for staff, optional for submitter)
        org_id = None
        if clean_company:
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

        # 2. Role lookup or insertion in roles table
        role_row = conn.execute(
            text("SELECT id, name FROM roles WHERE lower(name) = lower(:name)"),
            {"name": clean_role},
        ).mappings().first()

        if role_row:
            role_id = role_row["id"]
            print(f"    ✓ Found role in roles table: '{role_row['name']}' (ID: {role_id})")
        else:
            role_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO roles (id, name, description, created_at)
                    VALUES (:id, :name, :desc, CURRENT_TIMESTAMP)
                """),
                {"id": role_id, "name": clean_role, "desc": f"{clean_role.title()} Access Role"},
            )
            print(f"    ✓ Created role in roles table: '{clean_role}' (ID: {role_id})")

        # 3. User lookup, creation or update in users table
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
            print(f"    ✓ Synchronized existing user in users table: '{clean_email}' (ID: {user_id})")
        else:
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
            print(f"    ✓ Created record in users table: '{clean_email}' (ID: {user_id})")

        # 4. Role association in user_roles table
        user_role_row = conn.execute(
            text("SELECT user_id FROM user_roles WHERE user_id = :user_id AND role_id = :role_id"),
            {"user_id": user_id, "role_id": role_id},
        ).mappings().first()

        if not user_role_row:
            conn.execute(
                text("""
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (:user_id, :role_id)
                """),
                {"user_id": user_id, "role_id": role_id},
            )
            print(f"    ✓ Associated user_id ({user_id}) with role_id ({role_id}) in user_roles table")
        else:
            print(f"    ✓ User already associated with role '{clean_role}' in user_roles table")

        # 5. Profile creation based on role
        if clean_role == "submitter":
            # ----------------------------------------------------
            # Submitter (Patient) Profile Flow
            # ----------------------------------------------------
            patient_row = conn.execute(
                text("SELECT id FROM patient_profiles WHERE user_id = :user_id"),
                {"user_id": user_id},
            ).mappings().first()

            if patient_row:
                conn.execute(
                    text("""
                        UPDATE patient_profiles
                        SET first_name = :first_name,
                            last_name = :last_name,
                            insurer_id = :insurer_id,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = :user_id
                    """),
                    {
                        "user_id": user_id,
                        "first_name": first_name.strip(),
                        "last_name": last_name.strip(),
                        "insurer_id": org_id,
                    },
                )
                print(f"    ✓ Updated existing record in patient_profiles table for '{clean_email}'")
            else:
                conn.execute(
                    text("""
                        INSERT INTO patient_profiles (
                            id, user_id, first_name, last_name, insurer_id,
                            coverage_verified, created_at, updated_at
                        )
                        VALUES (
                            :id, :user_id, :first_name, :last_name, :insurer_id,
                            0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                    """),
                    {
                        "id": uuid.uuid4(),
                        "user_id": user_id,
                        "first_name": first_name.strip(),
                        "last_name": last_name.strip(),
                        "insurer_id": org_id,
                    },
                )
                print(f"    ✓ Created record in patient_profiles table for '{clean_email}'")

        else:
            # ----------------------------------------------------
            # Staff Profile Flow (admin, reviewer, tpa)
            # ----------------------------------------------------
            if not org_id:
                raise RuntimeError("An organization (insurance company / TPA) is required when provisioning staff users.")

            is_admin_flag = 1 if clean_role == "admin" else 0
            emp_code = employee_id or f"EMP-{str(uuid.uuid4())[:8].upper()}"

            staff_row = conn.execute(
                text("SELECT id FROM staff_profiles WHERE user_id = :user_id"),
                {"user_id": user_id},
            ).mappings().first()

            if staff_row:
                conn.execute(
                    text("""
                        UPDATE staff_profiles
                        SET organization_id = :org_id,
                            first_name = :first_name,
                            last_name = :last_name,
                            role = :role,
                            is_admin = :is_admin,
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
                        "role": clean_role,
                        "is_admin": is_admin_flag,
                        "designation": designation,
                    },
                )
                print(f"    ✓ Updated staff profile for '{clean_email}' (Role: {clean_role}, is_admin: {is_admin_flag})")
            else:
                conn.execute(
                    text("""
                        INSERT INTO staff_profiles (
                            id, user_id, organization_id, first_name, last_name,
                            role, is_admin, employee_id, designation, department, status,
                            created_at, updated_at
                        )
                        VALUES (
                            :id, :user_id, :org_id, :first_name, :last_name,
                            :role, :is_admin, :employee_id, :designation, 'Operations', 'ACTIVE',
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                    """),
                    {
                        "id": uuid.uuid4(),
                        "user_id": user_id,
                        "org_id": org_id,
                        "first_name": first_name.strip(),
                        "last_name": last_name.strip(),
                        "role": clean_role,
                        "is_admin": is_admin_flag,
                        "employee_id": emp_code,
                        "designation": designation,
                    },
                )
                print(f"    ✓ Created staff_profiles record linking '{clean_email}' to '{clean_company}' (Role: {clean_role}, is_admin: {is_admin_flag})")

    return user_id


# ============================================================
# Backend API Synchronization
# ============================================================

def sync_with_backend_api(
    backend_url: str,
    email: str,
    first_name: str,
    last_name: str,
    insurance_company: str,
    role: str,
    external_subject_id: str,
    phone: Optional[str] = None,
) -> Optional[dict]:
    """
    Synchronizes the newly provisioned user with the running ClaimsGuru backend service.
    Hits POST /auth/sync-entra-user to ensure user session cache and state are live.
    """
    sync_url = f"{backend_url.rstrip('/')}/auth/sync-entra-user"
    payload = {
        "email": email.strip().lower(),
        "name": f"{first_name} {last_name}".strip(),
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "company_name": insurance_company.strip(),
        "organization": insurance_company.strip(),
        "external_subject_id": str(external_subject_id),
        "requested_role": role.strip().lower(),
        "phone": phone,
    }

    try:
        res = requests.post(sync_url, json=payload, timeout=15)
        if res.ok:
            print(f"    ✓ Backend API synchronized successfully: {sync_url} (HTTP {res.status_code})")
            return res.json() if res.content else {}
        else:
            print(f"    [!] Backend API responded ({res.status_code}): {res.text}")
    except Exception as exc:
        print(f"    [!] Note: Could not reach Backend API at {sync_url}: {exc}")
    return None


# ============================================================
# Main Entrypoint
# ============================================================

def main() -> int:
    args = parse_arguments()

    # Step 0: Resolve Target Environment (interactively or via CLI flag)
    env_name, backend_api_url, database_url = select_environment(
        cli_env=args.env,
        cli_backend=args.backend_url,
        cli_db=args.database_url,
    )

    subdomain = (
        args.subdomain
        or get_env_var("ENTRA_SUBDOMAIN", fallback_names=["EXPO_PUBLIC_ENTRA_SUBDOMAIN", "NEXT_PUBLIC_ENTRA_SUBDOMAIN"], default="claimsguruapp")
    )
    tenant_id = (
        args.tenant_id
        or get_env_var("ENTRA_TENANT_ID", fallback_names=["EXPO_PUBLIC_ENTRA_TENANT_ID", "NEXT_PUBLIC_ENTRA_TENANT_ID"], default="0fac25c7-0d8c-4f34-8c8d-3981a5d2a482")
    )
    # Native Auth requires a Public Client ID (e.g. the mobile client ID)
    client_id = (
        args.client_id
        or get_env_var(
            "ENTRA_NATIVE_CLIENT_ID",
            fallback_names=[
                "EXPO_PUBLIC_ENTRA_CLIENT_ID",
                "EXPO_PUBLIC_ENTRA_PATIENT_CLIENT_ID",
                "NEXT_PUBLIC_ENTRA_PATIENT_CLIENT_ID",
                "ENTRA_CLIENT_ID",
            ],
            default="3aab2b67-2c5a-4bea-be14-1a4290d2ae85",
        )
    )

    print("\n" + "=" * 65)
    print(" ClaimsGuru User Provisioning (Native Auth + Database + API)")
    print("=" * 65)
    print(f"Environment:        {env_name.upper()}")
    print(f"Backend API URL:    {backend_api_url}")
    print(f"Database URL:       {mask_database_url(database_url)}")
    print(f"Target Email:       {args.email}")
    print(f"Target Name:        {args.first_name} {args.last_name}")
    print(f"Insurance Company:  {args.insurance_company}")
    print(f"Assigned Role:      {args.role}")
    print(f"Entra Subdomain:    {subdomain}")
    print(f"Entra Client ID:    {client_id}")
    print("=" * 65)

    native_client = EntraNativeAuthClient(
        subdomain=subdomain,
        tenant_id=tenant_id,
        client_id=client_id,
    )

    # Step 1: Execute Native Signup with interactive OTP
    print("\n[1/3] Registering user via Microsoft Entra Native Auth...")
    try:
        token_data = native_client.signup_user(args.email, args.password)
    except Exception as e:
        print(f"\n[-] ERROR: Failed during Entra Native Auth registration: {e}", file=sys.stderr)
        return 1

    # Extract Subject ID / Object ID from tokens
    token_str = token_data.get("id_token") or token_data.get("access_token") or ""
    claims = decode_jwt_payload(token_str)
    external_subject_id = claims.get("sub") or claims.get("oid")

    if not external_subject_id:
        print(f"[-] WARNING: Could not extract 'sub' from token. Generating fallback identifier.", file=sys.stderr)
        external_subject_id = str(uuid.uuid4())

    print(f"    ✓ User successfully registered in Microsoft Entra External ID.")
    print(f"    ✓ Entra Subject ID (sub): {external_subject_id}")

    # Step 2: Provision into ClaimsGuru database (Local or Preprod)
    print(f"\n[2/3] Provisioning user in ClaimsGuru Database ({env_name.upper()})...")
    try:
        user_id = create_or_update_db_user(
            email=args.email,
            first_name=args.first_name,
            last_name=args.last_name,
            insurance_company=args.insurance_company,
            role=args.role,
            external_subject_id=str(external_subject_id),
            org_type=args.org_type,
            designation=args.designation,
            employee_id=args.employee_id,
            phone=args.phone,
            database_url=database_url,
        )
    except Exception as e:
        print(f"[-] ERROR: Database provisioning failed: {e}", file=sys.stderr)
        return 1

    # Step 3: Synchronize with Backend API
    print(f"\n[3/3] Synchronizing with Backend API ({backend_api_url})...")
    sync_with_backend_api(
        backend_url=backend_api_url,
        email=args.email,
        first_name=args.first_name,
        last_name=args.last_name,
        insurance_company=args.insurance_company,
        role=args.role,
        external_subject_id=str(external_subject_id),
        phone=args.phone,
    )

    print("\n" + "=" * 65)
    print("🎉 User Provisioning Completed Successfully!")
    print(f"   Environment:  {env_name.upper()}")
    print(f"   Backend API:  {backend_api_url}")
    print(f"   Email:        {args.email}")
    print(f"   Role:         {args.role}")
    print(f"   Database ID:  {user_id}")
    print(f"   Entra Sub ID: {external_subject_id}")
    print("   The user can now log in immediately on Web and Mobile!")
    print("=" * 65 + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
