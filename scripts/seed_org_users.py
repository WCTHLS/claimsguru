import uuid
from libs.shared.db import SessionLocal
from libs.shared.models import Role, Organization, StaffProfile, User
from libs.auth.passwords import hash_password
from sqlalchemy import text

db = SessionLocal()

# 1. Ensure Star Health organization exists
org = db.query(Organization).filter(Organization.name == 'Star Health').first()
if not org:
    org = Organization(id=uuid.uuid4(), name='Star Health', type='INSURER', status='ACTIVE')
    db.add(org)
    db.commit()
    db.refresh(org)

# 2. Ensure Admin user exists
admin_email = 'admin@starhealth.com'
user = db.query(User).filter(User.email == admin_email).first()
pw_hash = hash_password('Password@123')
if not user:
    user = User(
        id=uuid.uuid4(),
        email=admin_email,
        external_provider='local',
        external_subject_id=admin_email,
        status='ACTIVE',
        email_verified=True,
        password_hash=pw_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
else:
    user.password_hash = pw_hash
    user.status = 'ACTIVE'
    db.commit()

admin_role = db.query(Role).filter(Role.name == 'admin').first()
db.execute(
    text('IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :uid AND role_id = :rid) INSERT INTO user_roles (id, user_id, role_id) VALUES (:id, :uid, :rid)'),
    {'id': uuid.uuid4(), 'uid': user.id, 'rid': admin_role.id}
)
db.commit()

sp = db.query(StaffProfile).filter(StaffProfile.user_id == user.id).first()
if not sp:
    db.execute(
        text("INSERT INTO staff_profiles (id, user_id, organization_id, first_name, last_name, designation, status, employee_id) VALUES (:id, :uid, :oid, 'StarHealth', 'Admin', 'Claims Administrator', 'ACTIVE', 'EMP-001')"),
        {'id': uuid.uuid4(), 'uid': user.id, 'oid': org.id}
    )
    db.commit()

# 3. Ensure Reviewer user exists
rev_email = 'reviewer@starhealth.com'
rev_user = db.query(User).filter(User.email == rev_email).first()
if not rev_user:
    rev_user = User(
        id=uuid.uuid4(),
        email=rev_email,
        external_provider='local',
        external_subject_id=rev_email,
        status='ACTIVE',
        email_verified=True,
        password_hash=pw_hash,
    )
    db.add(rev_user)
    db.commit()
    db.refresh(rev_user)
else:
    rev_user.password_hash = pw_hash
    rev_user.status = 'ACTIVE'
    db.commit()

rev_role = db.query(Role).filter(Role.name == 'reviewer').first()
db.execute(
    text('IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :uid AND role_id = :rid) INSERT INTO user_roles (id, user_id, role_id) VALUES (:id, :uid, :rid)'),
    {'id': uuid.uuid4(), 'uid': rev_user.id, 'rid': rev_role.id}
)
db.commit()

sp_rev = db.query(StaffProfile).filter(StaffProfile.user_id == rev_user.id).first()
if not sp_rev:
    db.execute(
        text("INSERT INTO staff_profiles (id, user_id, organization_id, first_name, last_name, designation, status, employee_id) VALUES (:id, :uid, :oid, 'Claims', 'Reviewer', 'Senior Medical Auditor', 'ACTIVE', 'EMP-002')"),
        {'id': uuid.uuid4(), 'uid': rev_user.id, 'oid': org.id}
    )
    db.commit()

print('ALL ORGANIZATION CREDENTIALS SEEDED!')
db.close()
