-- =====================================================
-- Migration 005: TPA adjuster registration fields and role
-- =====================================================

ALTER TABLE staff_profiles
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

-- New installations enforce names in the base schema. Existing installations
-- may have staff records created before this migration, so retain nullable
-- columns until their historical records have been backfilled.

INSERT INTO roles (name, description) VALUES
    ('tpa_adjuster', 'TPA adjuster claim-review access')
ON CONFLICT (name) DO NOTHING;
