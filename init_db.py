import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine

# 1. Setup paths
root = os.path.abspath(os.getcwd())
sys.path.append(root)
sys.path.append(os.path.join(root, "services", "parser", "app"))

load_dotenv()

# 2. Get your DB URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to standard local dev string if .env is missing it
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/claimgpt"

try:
    engine = create_engine(DATABASE_URL)

    # 3. Import the Bases



    # Parser Base from services
    # Explicitly import all coding models so SQLAlchemy registers them
    from services.coding.app import models as coding_models  # noqa: F401

    # Coding Base from services
    from services.coding.app.db import Base as CodingBase
    from services.parser.app.models import Base as ParserBase

    # Predictor Base from services
    from services.predictor.app.db import Base as PredictorBase
    from libs.shared.models import Base as SharedBase

    print(f"Connecting to: {DATABASE_URL}")

    # 4. Create all tables

    print("Registering Parser tables...")
    ParserBase.metadata.create_all(bind=engine)

    print("Registering Coding tables...")
    CodingBase.metadata.create_all(bind=engine)

    print("Registering Predictor tables...")
    PredictorBase.metadata.create_all(bind=engine)

    print("Registering Shared tables (users, organizations, invitations, profiles)...")
    SharedBase.metadata.create_all(bind=engine)

    # 5. Ensure newly added model columns exist on existing tables (SQL Server schema migration)
    print("Checking and migrating missing columns on existing tables...")
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    with engine.connect() as conn:
        if insp.has_table("claims"):
            cols = [c["name"] for c in insp.get_columns("claims")]
            if "org_id" not in cols:
                conn.execute(text("ALTER TABLE claims ADD org_id UNIQUEIDENTIFIER NULL;"))
                if insp.has_table("organizations"):
                    try:
                        conn.execute(text("ALTER TABLE claims ADD CONSTRAINT FK_claims_organizations FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;"))
                    except Exception:
                        pass
                print("  -> Added missing column 'org_id' to 'claims'")
            if "insurance_company" not in cols:
                conn.execute(text("ALTER TABLE claims ADD insurance_company VARCHAR(255) NULL;"))
                print("  -> Added missing column 'insurance_company' to 'claims'")

        if insp.has_table("claim_field_feedback"):
            cols = [c["name"] for c in insp.get_columns("claim_field_feedback")]
            if "predicted_value" not in cols:
                conn.execute(text("ALTER TABLE claim_field_feedback ADD predicted_value NVARCHAR(MAX) NULL;"))
                print("  -> Added missing column 'predicted_value' to 'claim_field_feedback'")
            if "action" not in cols:
                conn.execute(text("ALTER TABLE claim_field_feedback ADD action NVARCHAR(MAX) NULL;"))
                print("  -> Added missing column 'action' to 'claim_field_feedback'")
        conn.commit()

    print("[SUCCESS] All tables and columns are verified and up to date!")

except Exception as e:
    print(f"[ERROR] {e}")
