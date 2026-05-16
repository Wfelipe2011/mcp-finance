-- Migration 002: Pipeline AI Workers
-- Adds kind column to workers and creates digest_jobs, forecast_jobs, ml_training_jobs tables.
-- Safe to run on existing databases (uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS).

-- 1. Add kind column to workers (retrocompatível — DEFAULT 'enrich')
ALTER TABLE workers ADD COLUMN IF NOT EXISTS
  kind TEXT NOT NULL DEFAULT 'enrich' CHECK (kind IN ('enrich', 'digest', 'forecast'));

-- 2. digest_jobs
CREATE TABLE IF NOT EXISTS digest_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  worker_id   UUID REFERENCES workers(id),
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_digest_jobs_status ON digest_jobs (status);

-- 3. forecast_jobs
CREATE TABLE IF NOT EXISTS forecast_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  job_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  worker_id   UUID REFERENCES workers(id),
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, job_date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_jobs_status ON forecast_jobs (status);

-- 4. ml_training_jobs
CREATE TABLE IF NOT EXISTS ml_training_jobs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  mae         NUMERIC,
  mape        NUMERIC,
  started_at  TIMESTAMP,
  finished_at TIMESTAMP,
  error_msg   TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status ON ml_training_jobs (status);
