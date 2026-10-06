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
        else:
            print(f"  [=] Role exists: {r_name} ({existing})")

    print("\n--- 2. Ensuring Organizations Exist ---")
    orgs = [
        ("Star Health", "INSURER"),
        ("HDFC ERGO", "INSURER"),
        ("Care Health", "TPA"),
        ("ICICI Lombard", "TPA"),
    ]
    org_map = {}
    for o_name, o_type in orgs:
        oid = conn.execute(text("SELECT id FROM organizations WHERE name = :name"), {"name": o_name}).scalar()
        if not oid:
            oid = uuid.uuid4()
            conn.execute(text("INSERT INTO organizations (id, name, type, status) VALUES (:id, :name, :type, 'ACTIVE')"), {"id": oid, "name": o_name, "type": o_type})
            print(f"  [+] Created organization: {o_name} ({oid})")
        else:
            print(f"  [=] Organization exists: {o_name} ({oid})")
        org_map[o_name] = oid

    admin_role_id = conn.execute(text("SELECT id FROM roles WHERE name = 'admin'")).scalar()
    reviewer_role_id = conn.execute(text("SELECT id FROM roles WHERE name = 'reviewer'")).scalar()

    print("\n--- 3. Seeding TPA & Organization Staff Users ---")
    staff_users = [
        {
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
        },
        {
            "email": "swagathreddy.k@waferwire.com",
            "first_name": "Swagath",
            "last_name": "Reddy",
            "org_name": "Star Health",
            "role_id": admin_role_id,
            "role_name": "admin",
            "designation": "Executive Administrator",
            "emp_id": "EMP-WW-001",
            "provider": "entra",
            "subject_id": "swagathreddy.k@waferwire.com",
        },
        {
            "email": "swagathreddykasula@gmail.com",
            "first_name": "Swagath Reddy",
            "last_name": "Kasula",
            "org_name": "Star Health",
            "role_id": admin_role_id,
            "role_name": "admin",
            "designation": "TPA Claims Admin",
            "emp_id": "EMP-STAR-000",
            "provider": "entra",
            "subject_id": "ed686f14-ddc3-4b2c-9c3b-420260db0ae1",
        },
        {
            "email": "admin@starhealth.com",
            "first_name": "StarHealth",
            "last_name": "Admin",
            "org_name": "Star Health",
            "role_id": admin_role_id,
            "role_name": "admin",
            "designation": "Chief Claims Officer",
            "emp_id": "EMP-STAR-001",
            "provider": "local",
            "subject_id": "admin@starhealth.com",
        },
        {
            "email": "reviewer@starhealth.com",
            "first_name": "Claims",
            "last_name": "Reviewer",
            "org_name": "Star Health",
            "role_id": reviewer_role_id,
            "role_name": "reviewer",
            "designation": "Senior Medical Auditor",
            "emp_id": "EMP-STAR-002",
            "provider": "local",
            "subject_id": "reviewer@starhealth.com",
        },
    ]

    for u in staff_users:
        uid = conn.execute(text("SELECT id FROM users WHERE lower(email) = lower(:email)"), {"email": u["email"]}).scalar()
        if not uid:
            uid = uuid.uuid4()
            conn.execute(
                text("""
                    INSERT INTO users (id, email, external_provider, external_subject_id, status, email_verified)
                    VALUES (:id, :email, :provider, :subject_id, 'ACTIVE', 1)
                """),
                {
                    "id": uid,
                    "email": u["email"],
                    "provider": u["provider"],
                    "subject_id": u["subject_id"],
                }
            )
            print(f"  [+] Created user: {u['email']} ({uid})")
        else:
            conn.execute(
                text("""
                    UPDATE users 
                    SET external_provider = :provider, external_subject_id = :subject_id, status = 'ACTIVE'
                    WHERE id = :id
                """),
                {
                    "id": uid,
                    "provider": u["provider"],
                    "subject_id": u["subject_id"],
                }
            )
            print(f"  [=] Updated user: {u['email']} ({uid})")

        # Assign Role
        conn.execute(
            text("IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :uid AND role_id = :rid) INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)"),
            {"uid": uid, "rid": u["role_id"]}
        )

        # Create Staff Profile
        org_id = org_map.get(u["org_name"])
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
                    "oid": org_id,
                    "fname": u["first_name"],
                    "lname": u["last_name"],
                    "desig": u["designation"],
                    "empid": u["emp_id"],
                    "role_name": u["role_name"],
                }
            )
            print(f"  [+] Created staff_profile for {u['email']} at {u['org_name']} (Role: {u['role_name']})")
        else:
            conn.execute(
                text("""
                    UPDATE staff_profiles 
                    SET organization_id = :oid, first_name = :fname, last_name = :lname, designation = :desig, role = :role_name, status = 'ACTIVE'
                    WHERE user_id = :uid
                """),
                {
                    "uid": uid,
                    "oid": org_id,
                    "fname": u["first_name"],
                    "lname": u["last_name"],
                    "desig": u["designation"],
                    "role_name": u["role_name"],
                }
            )
            print(f"  [=] Updated staff_profile for {u['email']} at {u['org_name']}")

print("\n--- Verifying Staff Users in Pre-Prod ---")
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
        print(f"  User: {row[0]} | Role: {row[1]} | Org: {row[2]} | Title: {row[3]}")

print("\n[SUCCESS] Pre-Production TPA and Organization Staff users provisioned successfully!")
