-- Migration: remove-ml-infra
-- Remove tabelas de ML do banco de dados.
-- ATENÇÃO: irreversível. Fazer backup antes de executar.
-- Backup: pg_dump -U postgres -d finance --table=forecast_predictions
--           --table=forecast_daily_predictions --table=forecast_model_versions
--           --table=forecast_daily_test_results --table=ml_training_jobs -f ml-backup.sql

BEGIN;

-- 1. Remover FK de forecast_user_feedback → forecast_predictions
--    (forecast_user_feedback é preservada; apenas o vínculo com a tabela ML é removido)
ALTER TABLE forecast_user_feedback
  DROP CONSTRAINT IF EXISTS forecast_user_feedback_prediction_id_fkey;

-- 2. DROP TABLE em ordem de dependência (dependentes primeiro)
DROP TABLE IF EXISTS ml_training_jobs;
DROP TABLE IF EXISTS forecast_daily_test_results;
DROP TABLE IF EXISTS forecast_model_versions;
DROP TABLE IF EXISTS forecast_daily_predictions;
DROP TABLE IF EXISTS forecast_predictions;

COMMIT;
