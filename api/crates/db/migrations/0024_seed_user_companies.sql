-- =============================================================================
-- 0024  Seed user_companies — add all existing users to Test Company
--       Uses each user's system role as their company role.
--       The admin user is marked as primary; all others are primary by default
--       since they only belong to one company.
-- =============================================================================

DO $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT id INTO STRICT v_company_id FROM companies WHERE code = 'TEST';

    INSERT INTO user_companies (user_id, company_id, role, is_primary)
    SELECT id, v_company_id, role, TRUE
    FROM   users
    ON CONFLICT (user_id, company_id) DO NOTHING;
END;
$$;
