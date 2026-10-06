import uuid
from sqlalchemy import create_engine, text

SERVER = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
DATABASE = "claimsguru"
USER = "claimsgurupreprodadmin"
PASSWORD = "ClaimsGuruPreProdPass!2026"

conn_str = f"mssql+pymssql://{USER}:{PASSWORD}@{SERVER}:1433/{DATABASE}"
print(f"Connecting to Pre-Prod Azure SQL: {SERVER}/{DATABASE}...")
engine = create_engine(conn_str)

with engine.begin() as conn:
    print("\n--- 1. Ensuring Roles Exist ---")
    roles = [
        ("admin", "Full administrative access"),
        ("reviewer", "Claims Reviewer & Auditor access"),
        ("submitter", "Patient Submitter role"),
    ]
    for r_name, r_desc in roles:
        existing = conn.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": r_name}).scalar()
        if not existing:
            rid = uuid.uuid4()
            conn.execute(text("INSERT INTO roles (id, name, description) VALUES (:id, :name, :desc)"), {"id": rid, "name": r_name, "desc": r_desc})
            print(f"  [+] Created role: {r_name} ({rid})")

    print("\n--- 2. Ensuring Organization Exists ---")
    oid = conn.execute(text("SELECT id FROM organizations WHERE name = 'HDFC ERGO'")).scalar()
    if not oid:
        oid = uuid.uuid4()
        conn.execute(text("INSERT INTO organizations (id, name, type, status) VALUES (:id, 'HDFC ERGO', 'INSURER', 'ACTIVE')"), {"id": oid})
        print(f"  [+] Created organization: HDFC ERGO ({oid})")

    admin_role_id = conn.execute(text("SELECT id FROM roles WHERE name = 'admin'")).scalar()

    print("\n--- 3. Cleaning up Unwanted Staff Users from Pre-Prod ---")
    unwanted_emails = [
        "swagathreddy.k@waferwire.com",
        "admin@starhealth.com",
        "reviewer@starhealth.com",
    ]
    for u_email in unwanted_emails:
        uid = conn.execute(text("SELECT id FROM users WHERE lower(email) = lower(:email)"), {"email": u_email}).scalar()
        if uid:
            conn.execute(text("DELETE FROM staff_profiles WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": uid})
            conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})
            print(f"  [-] Removed unwanted user: {u_email}")

    # Remove staff profile for swagathreddykasula@gmail.com (keep as normal patient if needed, not staff)
    kasula_uid = conn.execute(text("SELECT id FROM users WHERE lower(email) = 'swagathreddykasula@gmail.com'")).scalar()
    if kasula_uid:
        conn.execute(text("DELETE FROM staff_profiles WHERE user_id = :uid"), {"uid": kasula_uid})
        conn.execute(text("DELETE FROM user_roles WHERE user_id = :uid AND role_id = :rid"), {"uid": kasula_uid, "rid": admin_role_id})
        print("  [-] Removed staff_profile and admin role from swagathreddykasula@gmail.com (kept as patient)")

    print("\n--- 4. Seeding ONLY swagathreddy128@gmail.com as TPA Staff ---")
    tpa_user = {
        "email": "swagathreddy128@gmail.com",
        "first_name": "Swagath",
        "last_name": "Reddy",
        "org_name": "HDFC ERGO",
        "role_id": admin_role_id,
        "role_name": "admin",
        "designation": "Claims Administrator",
        "emp_id": "EMP-HDFC-001",
        "provider": "entra",
        "subject_id": "ef933756-35eb-4760-ac97-011cb3236c7d",
    }

    uid = conn.execute(text("SELECT id FROM users WHERE lower(email) = lower(:email)"), {"email": tpa_user["email"]}).scalar()
    if not uid:
        uid = uuid.uuid4()
        conn.execute(
            text("""
                INSERT INTO users (id, email, external_provider, external_subject_id, status, email_verified)
                VALUES (:id, :email, :provider, :subject_id, 'ACTIVE', 1)
            """),
            {
                "id": uid,
                "email": tpa_user["email"],
                "provider": tpa_user["provider"],
                "subject_id": tpa_user["subject_id"],
            }
        )
        print(f"  [+] Created user: {tpa_user['email']} ({uid})")
    else:
        conn.execute(
            text("""
                UPDATE users 
                SET external_provider = :provider, external_subject_id = :subject_id, status = 'ACTIVE'
                WHERE id = :id
            """),
            {
                "id": uid,
                "provider": tpa_user["provider"],
                "subject_id": tpa_user["subject_id"],
            }
        )
        print(f"  [=] Updated user: {tpa_user['email']} ({uid})")

    # Assign Admin Role
    conn.execute(
        text("IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :uid AND role_id = :rid) INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)"),
        {"uid": uid, "rid": tpa_user["role_id"]}
    )

    # Assign Staff Profile
    sp_id = conn.execute(text("SELECT id FROM staff_profiles WHERE user_id = :uid"), {"uid": uid}).scalar()
    if not sp_id:
        conn.execute(
            text("""
                INSERT INTO staff_profiles (id, user_id, organization_id, first_name, last_name, designation, status, employee_id, role, is_admin)
                VALUES (:id, :uid, :oid, :fname, :lname, :desig, 'ACTIVE', :empid, :role_name, 1)
            """),
            {
                "id": uuid.uuid4(),
                "uid": uid,
                "oid": oid,
                "fname": tpa_user["first_name"],
                "lname": tpa_user["last_name"],
                "desig": tpa_user["designation"],
                "empid": tpa_user["emp_id"],
                "role_name": tpa_user["role_name"],
            }
        )
        print(f"  [+] Created staff_profile for {tpa_user['email']} at HDFC ERGO (Role: admin)")
    else:
        conn.execute(
            text("""
                UPDATE staff_profiles 
                SET organization_id = :oid, first_name = :fname, last_name = :lname, designation = :desig, role = :role_name, status = 'ACTIVE'
                WHERE user_id = :uid
            """),
            {
                "uid": uid,
                "oid": oid,
                "fname": tpa_user["first_name"],
                "lname": tpa_user["last_name"],
                "desig": tpa_user["designation"],
                "role_name": tpa_user["role_name"],
            }
        )
        print(f"  [=] Updated staff_profile for {tpa_user['email']} at HDFC ERGO")

print("\n--- Verifying Only Staff Users in Pre-Prod ---")
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT u.email, r.name as role, o.name as org_name, sp.designation
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        JOIN staff_profiles sp ON u.id = sp.user_id
        JOIN organizations o ON sp.organization_id = o.id
    """)).fetchall()
    for row in rows:
        print(f"  Staff User: {row[0]} | Role: {row[1]} | Org: {row[2]} | Title: {row[3]}")

print("\n[SUCCESS] Only swagathreddy128@gmail.com is now provisioned as staff in Pre-Prod!")
