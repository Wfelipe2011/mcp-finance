## Purpose
Define ml-trainer service isolation, runtime, and dependencies.
## Requirements
### Requirement: ml-trainer runs as an isolated Docker service
The system SHALL run the ML training worker as a separate Docker Compose service `ml-trainer`, built from `Dockerfile.ml-trainer`, isolated from the `api-server` and `supervisor` services.

#### Scenario: Service starts and depends on healthy Postgres
- **WHEN** `docker compose up` is run
- **THEN** `ml-trainer` starts only after `postgres` passes its health check
- **AND** `ml-trainer` uses `restart: always` to recover from failures

#### Scenario: Service uses a separate superuser database connection
- **WHEN** `ml-trainer` connects to Postgres
- **THEN** it uses the `ML_DATABASE_URL` environment variable (superuser credentials)
- **AND** does NOT share `DATABASE_URL` with `api-server`

#### Scenario: Python dependencies are installed in the image
- **WHEN** `Dockerfile.ml-trainer` is built
- **THEN** the image includes: `scikit-learn`, `pandas`, `psycopg2-binary`, `joblib`, `numpy`, `schedule`
- **AND** the base image is `python:3.11-slim`

## ADDED Requirements

### Requirement: ml-trainer runs as an isolated Docker service
The system SHALL run the ML training worker as a separate Docker Compose service `ml-trainer`, built from `Dockerfile.ml-trainer`, isolated from the `api-server` and `supervisor` services.

#### Scenario: Service starts and depends on healthy Postgres
- **WHEN** `docker compose up` is run
- **THEN** `ml-trainer` starts only after `postgres` passes its health check
- **AND** `ml-trainer` uses `restart: always` to recover from failures

#### Scenario: Service uses a separate superuser database connection
- **WHEN** `ml-trainer` connects to Postgres
- **THEN** it uses the `ML_DATABASE_URL` environment variable (superuser credentials)
- **AND** does NOT share `DATABASE_URL` with `api-server`

#### Scenario: Python dependencies are installed in the image
- **WHEN** `Dockerfile.ml-trainer` is built
- **THEN** the image includes: `scikit-learn`, `pandas`, `psycopg2-binary`, `joblib`, `numpy`, `schedule`
- **AND** the base image is `python:3.11-slim`
