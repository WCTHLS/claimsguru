-- Migration: Add predicted_value and action columns to claim_field_feedback
-- Purpose: Match ClaimFieldFeedback SQLAlchemy model in MSSQL / PostgreSQL
-- Date: 2026-09-30

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('claim_field_feedback') 
    AND name = 'predicted_value'
)
BEGIN
    ALTER TABLE claim_field_feedback ADD predicted_value NVARCHAR(MAX) NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('claim_field_feedback') 
    AND name = 'action'
)
BEGIN
    ALTER TABLE claim_field_feedback ADD action NVARCHAR(255) NULL;
END;
