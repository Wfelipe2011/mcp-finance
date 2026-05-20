-- ════════════════════════════════════════════════
-- grants.sql — run last (after all DDL scripts)
-- ════════════════════════════════════════════════
-- Grant DML permissions to the application role 'finance'.
-- This script runs as 'postgres' (the DDL superuser) via docker init,
-- after all tables, views, and sequences have been created by scripts 01–05.
-- The 'finance' role has NOSUPERUSER NOBYPASSRLS so RLS policies apply to it.
-- ════════════════════════════════════════════════
GRANT ALL ON ALL TABLES IN SCHEMA public TO finance;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO finance;

GRANT SELECT, INSERT, UPDATE, DELETE ON financial_goals TO finance;
GRANT USAGE, SELECT ON SEQUENCE financial_goals_id_seq TO finance;
GRANT SELECT ON goals_progress_view TO finance;
