import argparse
import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Setup paths and environment
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(root)

load_dotenv(os.path.join(root, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "mssql+pymssql://sa:YourStrong!Password@localhost:1433/claimgpt"


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def create_or_update_user(
    email: str,
    password: str,
    org_name: str = "Star Health",
    org_type: str = "INSURER",
    role_name: str = "admin",
    first_name: str = "Star Health",
    last_name: str = "Admin",
    employee_id: str = "SH-ADMIN-001",
    designation: str = "Organization Administrator",
):
    email = email.strip().lower()
    hashed_pwd = hash_password(password)
    engine = create_engine(DATABASE_URL)

    print(f"Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

    with engine.begin() as conn:
        # 1. Ensure Organization exists
        org_row = conn.execute(
            text("SELECT id, name FROM organizations WHERE lower(name) = lower(:name)"),
            {"name": org_name},
        ).mappings().first()

        if org_row:
            org_id = org_row["id"]
            print(f" Found existing organization '{org_row['name']}' (ID: {org_id})")
        else:
            org_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO organizations (id, name, type, status, created_at, updated_at)
                    VALUES (:id, :name, :type, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {"id": org_id, "name": org_name, "type": org_type},
            )
            print(f" Created organization '{org_name}' (ID: {org_id})")

        # 2. Ensure Role exists
        role_row = conn.execute(
            text("SELECT id, name FROM roles WHERE lower(name) = lower(:name)"),
            {"name": role_name},
        ).mappings().first()

        if role_row:
            role_id = role_row["id"]
            print(f" Found role '{role_row['name']}' (ID: {role_id})")
        else:
            role_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO roles (id, name, description, created_at)
                    VALUES (:id, :name, :desc, CURRENT_TIMESTAMP)
                """),
                {"id": role_id, "name": role_name.lower(), "desc": f"{role_name.title()} Access Role"},
            )
            print(f" Created role '{role_name}' (ID: {role_id})")

        # 3. Create or update User
        user_row = conn.execute(
            text("SELECT id FROM users WHERE lower(email) = lower(:email)"),
            {"email": email},
        ).mappings().first()

        if user_row:
            user_id = user_row["id"]
            conn.execute(
                text("""
                    UPDATE users
                    SET password_hash = :pwd,
                        status = 'ACTIVE',
                        email_verified = 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {"id": user_id, "pwd": hashed_pwd},
            )
            print(f" Updated existing user '{email}' (ID: {user_id})")
        else:
            user_id = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO users (id, email, external_provider, external_subject_id, status, email_verified, password_hash, created_at, updated_at)
                    VALUES (:id, :email, 'local', :email, 'ACTIVE', 1, :pwd, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {"id": user_id, "email": email, "pwd": hashed_pwd},
            )
            print(f" Created user '{email}' (ID: {user_id})")

        # 4. Map User to Role
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
            print(f" Assigned role '{role_name}' to user '{email}'")
        else:
            print(f" User already has role '{role_name}'")

        # 5. Create or update Staff Profile
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
                        employee_id = :employee_id,
                        designation = :designation,
                        status = 'ACTIVE',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                """),
                {
                    "user_id": user_id,
                    "org_id": org_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "employee_id": employee_id,
                    "designation": designation,
                },
            )
            print(f" Updated staff profile for '{email}'")
        else:
            conn.execute(
                text("""
                    INSERT INTO staff_profiles (id, user_id, organization_id, first_name, last_name, employee_id, designation, status, created_at, updated_at)
                    VALUES (:id, :user_id, :org_id, :first_name, :last_name, :employee_id, :designation, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "org_id": org_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "employee_id": employee_id,
                    "designation": designation,
                },
            )
            print(f" Created staff profile linking '{email}' to organization '{org_name}'")

    print("\n=======================================================")
    print(" [*] STAR HEALTH ADMIN USER CREATED / CONFIGURED")
    print("=======================================================")
    print(f" Email / Username : {email}")
    print(f" Password         : {password}")
    print(f" Organization     : {org_name}")
    print(f" Role             : {role_name}")
    print(f" Status           : ACTIVE")
    print("=======================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or update an admin user in ClaimGPT DB.")
    parser.add_argument("--email", default="admin@starhealth.in", help="User email / login username")
    parser.add_argument("--password", default="StarHealth@Admin2026!", help="User password")
    parser.add_argument("--org", default="Star Health", help="Organization name")
    parser.add_argument("--role", default="admin", help="Role (admin / reviewer / submitter)")
    parser.add_argument("--first-name", default="Star Health", help="First name")
    parser.add_argument("--last-name", default="Admin", help="Last name")
    parser.add_argument("--employee-id", default="SH-ADMIN-001", help="Employee ID")

    args = parser.parse_args()

    create_or_update_user(
        email=args.email,
        password=args.password,
        org_name=args.org,
        role_name=args.role,
        first_name=args.first_name,
        last_name=args.last_name,
        employee_id=args.employee_id,
    )
