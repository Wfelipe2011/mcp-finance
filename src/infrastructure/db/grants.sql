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
