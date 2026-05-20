-- Migration 005: Unified job_queue — substitui enrich_jobs, digest_jobs,
-- forecast_jobs e daily_insight_jobs por uma única fila com priority_score.
-- Aplicar em banco existente: psql $DATABASE_URL -f this_file.sql
-- Para banco fresh: schema.sql e forecast.sql já foram atualizados.

BEGIN;

-- ── job_queue ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_queue (
  id             BIGSERIAL PRIMARY KEY,
  job_type       TEXT      NOT NULL CHECK (job_type IN ('enrich', 'digest', 'forecast', 'daily_insight')),
  tenant_id      UUID      NOT NULL REFERENCES tenants(id),
  payload        JSONB     NOT NULL DEFAULT '{}',
  ref_date       DATE      NOT NULL,
  priority_base  INT       NOT NULL DEFAULT 0,
  priority_score INT       NOT NULL DEFAULT 0,
  status         TEXT      NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped')),
  attempts       INT       NOT NULL DEFAULT 0,
  worker_id      UUID,
  started_at     TIMESTAMP,
  finished_at    TIMESTAMP,
  error_msg      TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (job_type, tenant_id, ref_date)
);

CREATE INDEX IF NOT EXISTS idx_job_queue_priority
  ON job_queue (priority_score ASC, created_at ASC)
  WHERE status = 'pending';

-- ── claim_next_job ──────────────────────────────────────────────────────────
-- Seleciona e marca o próximo job como 'running' atomicamente via SKIP LOCKED.
CREATE OR REPLACE FUNCTION claim_next_job(p_worker_id UUID)
RETURNS TABLE(
  job_id       BIGINT,
  job_type     TEXT,
  tenant_id    UUID,
  payload      JSONB,
  ref_date     DATE,
  attempts     INT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH next AS (
    SELECT id
    FROM job_queue
    WHERE status = 'pending'
    ORDER BY priority_score ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE job_queue jq SET
    status     = 'running',
    worker_id  = p_worker_id,
    started_at = NOW(),
    finished_at = NULL,
    error_msg  = NULL,
    attempts   = jq.attempts + 1
  FROM next
  WHERE jq.id = next.id
  RETURNING jq.id, jq.job_type, jq.tenant_id, jq.payload, jq.ref_date, jq.attempts;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
GRANT ALL ON TABLE    job_queue          TO finance;
GRANT ALL ON SEQUENCE job_queue_id_seq   TO finance;
GRANT EXECUTE ON FUNCTION claim_next_job(UUID) TO finance;

-- ── Tabelas antigas ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS enrich_jobs CASCADE;
DROP TABLE IF EXISTS digest_jobs CASCADE;
DROP TABLE IF EXISTS forecast_jobs CASCADE;
DROP TABLE IF EXISTS daily_insight_jobs CASCADE;

COMMIT;
