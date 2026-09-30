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

    # 5. Schema patch for existing databases (e.g. MS SQL Server)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('claim_field_feedback') 
                    AND name = 'predicted_value'
                )
                BEGIN
                    ALTER TABLE claim_field_feedback ADD predicted_value NVARCHAR(MAX) NULL;
                END
            """))
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('claim_field_feedback') 
                    AND name = 'action'
                )
                BEGIN
                    ALTER TABLE claim_field_feedback ADD action NVARCHAR(255) NULL;
                END
            """))
            conn.commit()
        except Exception as patch_err:
            pass

    print("[SUCCESS] All tables including 'invitations', 'medical_codes' and 'features' are created!")

except Exception as e:
    print(f"[ERROR] {e}")
