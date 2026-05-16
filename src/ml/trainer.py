"""
ML Trainer — forecast-ml-worker
Treina um RandomForestRegressor por tenant usando cube_gastos_mensais
e salva predições para os próximos 3 meses em forecast_predictions.

Roda diariamente às 00:00 BRT (03:00 UTC) via scheduler.
Conexão superuser (ML_DATABASE_URL) para acesso cross-tenant sem RLS.
"""

import os
import logging
import time
import calendar
from datetime import date

import pandas as pd
import numpy as np
import psycopg2
import psycopg2.extras
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

ML_DATABASE_URL = os.environ["ML_DATABASE_URL"]
MODEL_VERSION = "v1"


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(ML_DATABASE_URL)


def _next_months(n: int = 3) -> list[tuple[int, int]]:
    """Return the next n (year, month) tuples from today."""
    today = date.today()
    year, month = today.year, today.month
    result = []
    for _ in range(n):
        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
        result.append((year, month))
    return result


# ──────────────────────────────────────────────────────────
# 3.1 get_all_tenants
# ──────────────────────────────────────────────────────────

def get_all_tenants() -> list[str]:
    """Return UUIDs of all active tenants."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tenants WHERE status = 'active'")
            return [str(row[0]) for row in cur.fetchall()]


# ──────────────────────────────────────────────────────────
# 3.2 load_tenant_data
# ──────────────────────────────────────────────────────────

def load_tenant_data(tenant_id: str) -> pd.DataFrame:
    """
    Query cube_gastos_mensais via superuser (bypasses security_invoker RLS)
    and aggregate at tenant level: (year, month, category_pt, group_pt) → total_gastos.
    """
    sql = """
        SELECT
            g.year,
            g.month,
            g.category_pt,
            g.group_pt,
            SUM(g.total_gastos) AS total_gastos
        FROM cube_gastos_mensais g
        JOIN tenant_members tm ON tm.display_name = g.display_name
        WHERE tm.tenant_id = %s
        GROUP BY g.year, g.month, g.category_pt, g.group_pt
        ORDER BY g.year, g.month, g.category_pt
    """
    with get_connection() as conn:
        df = pd.read_sql(sql, conn, params=(tenant_id,))
    df["total_gastos"] = df["total_gastos"].astype(float)
    return df


# ──────────────────────────────────────────────────────────
# 3.3 compute_features
# ──────────────────────────────────────────────────────────

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add mes_do_ano, media_3m_categoria, total_meses_hist to the DataFrame."""
    df = df.copy()
    df["mes_do_ano"] = df["month"]

    # Sort by category and time for rolling window
    df = df.sort_values(["category_pt", "year", "month"]).reset_index(drop=True)

    # Rolling 3-month average per category (ordered by time)
    df["media_3m_categoria"] = (
        df.groupby("category_pt")["total_gastos"]
        .transform(lambda x: x.rolling(3, min_periods=1).mean())
    )

    # Total distinct months in tenant history
    total_meses_hist = df[["year", "month"]].drop_duplicates().shape[0]
    df["total_meses_hist"] = total_meses_hist

    return df


# ──────────────────────────────────────────────────────────
# 3.4 train_model
# ──────────────────────────────────────────────────────────

def train_model(df_tenant: pd.DataFrame) -> tuple:
    """
    Train a RandomForestRegressor pipeline with OneHotEncoder for
    category_pt and group_pt. Returns (pipeline, mae, mape).
    """
    feature_cols = [
        "mes_do_ano",
        "media_3m_categoria",
        "total_meses_hist",
        "category_pt",
        "group_pt",
    ]
    categorical_cols = ["category_pt", "group_pt"]

    X = df_tenant[feature_cols]
    y = df_tenant["total_gastos"]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                categorical_cols,
            ),
        ],
        remainder="passthrough",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=200, max_depth=15, random_state=42
                ),
            ),
        ]
    )

    pipeline.fit(X, y)

    y_pred = pipeline.predict(X)
    mae = float(mean_absolute_error(y, y_pred))
    # MAPE with small epsilon to avoid division by zero
    mape = float(np.mean(np.abs((y.values - y_pred) / (np.abs(y.values) + 1e-9))) * 100)

    return pipeline, mae, mape


# ──────────────────────────────────────────────────────────
# 3.5 generate_predictions
# ──────────────────────────────────────────────────────────

def generate_predictions(
    pipeline: Pipeline, df_tenant: pd.DataFrame, tenant_id: str
) -> list[dict]:
    """
    Generate predictions for each category × next 3 months.
    Uses per-tree std for lower/upper bounds (predicted ± 2σ).
    """
    future_months = _next_months(3)
    categories = df_tenant[["category_pt", "group_pt"]].drop_duplicates()
    total_meses_hist = int(df_tenant["total_meses_hist"].iloc[0])
    rf: RandomForestRegressor = pipeline.named_steps["model"]
    preprocessor = pipeline.named_steps["preprocessor"]

    predictions = []

    for target_year, target_month in future_months:
        for _, cat_row in categories.iterrows():
            cat = cat_row["category_pt"]
            grp = cat_row["group_pt"]

            # media_3m_categoria: mean of last 3 months for this category
            cat_hist = (
                df_tenant[df_tenant["category_pt"] == cat]
                .sort_values(["year", "month"])["total_gastos"]
            )
            media_3m = float(cat_hist.iloc[-3:].mean() if len(cat_hist) >= 3 else cat_hist.mean())

            X_pred = pd.DataFrame(
                [
                    {
                        "mes_do_ano": target_month,
                        "media_3m_categoria": media_3m,
                        "total_meses_hist": total_meses_hist,
                        "category_pt": cat,
                        "group_pt": grp,
                    }
                ]
            )

            # Individual tree predictions for uncertainty estimation
            X_transformed = preprocessor.transform(X_pred)
            tree_preds = np.array(
                [tree.predict(X_transformed)[0] for tree in rf.estimators_]
            )

            predicted = float(np.mean(tree_preds))
            std = float(np.std(tree_preds))
            lower = max(0.0, predicted - 2 * std)
            upper = predicted + 2 * std

            predictions.append(
                {
                    "tenant_id": tenant_id,
                    "category_pt": cat,
                    "group_pt": grp,
                    "target_year": target_year,
                    "target_month": target_month,
                    "predicted_amount": round(predicted, 2),
                    "lower_bound": round(lower, 2),
                    "upper_bound": round(upper, 2),
                    "model_version": MODEL_VERSION,
                    "status": "ok",
                }
            )

    return predictions


# ──────────────────────────────────────────────────────────
# 3.6 save_predictions
# ──────────────────────────────────────────────────────────

def save_predictions(conn, predictions: list[dict]) -> None:
    """UPSERT predictions into forecast_predictions."""
    sql = """
        INSERT INTO forecast_predictions
            (tenant_id, category_pt, group_pt, target_year, target_month,
             predicted_amount, lower_bound, upper_bound, model_version, status, updated_at)
        VALUES
            (%(tenant_id)s, %(category_pt)s, %(group_pt)s, %(target_year)s, %(target_month)s,
             %(predicted_amount)s, %(lower_bound)s, %(upper_bound)s, %(model_version)s, %(status)s, NOW())
        ON CONFLICT (tenant_id, category_pt, target_year, target_month) DO UPDATE SET
            group_pt         = EXCLUDED.group_pt,
            predicted_amount = EXCLUDED.predicted_amount,
            lower_bound      = EXCLUDED.lower_bound,
            upper_bound      = EXCLUDED.upper_bound,
            model_version    = EXCLUDED.model_version,
            status           = EXCLUDED.status,
            updated_at       = NOW()
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, predictions)
    conn.commit()


# ──────────────────────────────────────────────────────────
# 3.7 save_model_meta
# ──────────────────────────────────────────────────────────

def save_model_meta(conn, tenant_id: str, meta: dict) -> None:
    """Insert a training metadata row into forecast_model_meta."""
    sql = """
        INSERT INTO forecast_model_meta
            (tenant_id, trained_at, months_of_history, num_categories, mae, mape, status, error_message)
        VALUES
            (%(tenant_id)s, NOW(), %(months_of_history)s, %(num_categories)s,
             %(mae)s, %(mape)s, %(status)s, %(error_message)s)
    """
    with conn.cursor() as cur:
        cur.execute(sql, {"tenant_id": tenant_id, **meta})
    conn.commit()


# ──────────────────────────────────────────────────────────
# 3.8 train_all_tenants (orchestrator)
# 3.10 per-tenant exception handling
# ──────────────────────────────────────────────────────────

def train_all_tenants() -> None:
    """
    Full training cycle: list tenants → for each: load data → check minimum
    history → train → predict → save. Failures in one tenant do not stop others.
    """
    logger.info("=== Training cycle started ===")

    tenants = get_all_tenants()
    logger.info(f"Found {len(tenants)} active tenant(s)")

    for tenant_id in tenants:
        # 3.10: exception per tenant — failure in one does not stop others
        try:
            logger.info(f"[{tenant_id}] Loading data...")
            df = load_tenant_data(tenant_id)

            # Check for empty dataset
            if df.empty:
                logger.warning(f"[{tenant_id}] No spending data found — skipping")
                with get_connection() as conn:
                    save_model_meta(
                        conn,
                        tenant_id,
                        {
                            "months_of_history": 0,
                            "num_categories": 0,
                            "mae": None,
                            "mape": None,
                            "status": "insufficient_data",
                            "error_message": "No spending data available",
                        },
                    )
                continue

            # Verify minimum 3 months of history
            months_of_history = df[["year", "month"]].drop_duplicates().shape[0]
            num_categories = df["category_pt"].nunique()

            if months_of_history < 3:
                logger.warning(
                    f"[{tenant_id}] Only {months_of_history} month(s) of history "
                    f"(minimum 3) — skipping"
                )
                with get_connection() as conn:
                    save_model_meta(
                        conn,
                        tenant_id,
                        {
                            "months_of_history": months_of_history,
                            "num_categories": num_categories,
                            "mae": None,
                            "mape": None,
                            "status": "insufficient_data",
                            "error_message": (
                                f"Insufficient history: {months_of_history} month(s) "
                                f"(minimum 3 required)"
                            ),
                        },
                    )
                continue

            logger.info(
                f"[{tenant_id}] {months_of_history} months, {num_categories} categories — training..."
            )
            df_features = compute_features(df)
            pipeline, mae, mape = train_model(df_features)

            logger.info(f"[{tenant_id}] Generating predictions for next 3 months...")
            predictions = generate_predictions(pipeline, df_features, tenant_id)

            with get_connection() as conn:
                save_predictions(conn, predictions)
                save_model_meta(
                    conn,
                    tenant_id,
                    {
                        "months_of_history": months_of_history,
                        "num_categories": num_categories,
                        "mae": round(mae, 4),
                        "mape": round(mape, 4),
                        "status": "ok",
                        "error_message": None,
                    },
                )

            logger.info(
                f"[{tenant_id}] Done. MAE={mae:.2f} MAPE={mape:.2f}% "
                f"predictions={len(predictions)}"
            )

        except Exception as exc:  # noqa: BLE001
            logger.error(f"[{tenant_id}] Training failed: {exc}", exc_info=True)
            try:
                with get_connection() as conn:
                    save_model_meta(
                        conn,
                        tenant_id,
                        {
                            "months_of_history": None,
                            "num_categories": None,
                            "mae": None,
                            "mape": None,
                            "status": "error",
                            "error_message": str(exc)[:500],
                        },
                    )
            except Exception as meta_exc:
                logger.error(
                    f"[{tenant_id}] Failed to save error metadata: {meta_exc}"
                )

    logger.info("=== Training cycle complete ===")


# ──────────────────────────────────────────────────────────
# Queue functions — ml_training_jobs
# ──────────────────────────────────────────────────────────

def next_training_job() -> dict | None:
    """Claim next pending ml_training_job (FOR UPDATE SKIP LOCKED)."""
    sql = """
        WITH next AS (
            SELECT id, tenant_id
            FROM ml_training_jobs
            WHERE status = 'pending'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        UPDATE ml_training_jobs SET
            status = 'running',
            started_at = NOW(),
            attempts = attempts + 1
        FROM next
        WHERE ml_training_jobs.id = next.id
        RETURNING ml_training_jobs.id, ml_training_jobs.tenant_id
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            conn.commit()
            row = cur.fetchone()
            return dict(row) if row else None


def mark_training_done(job_id: int, mae: float, mape: float) -> None:
    """Mark ml_training_job as done with metrics."""
    sql = """
        UPDATE ml_training_jobs
        SET status = 'done', finished_at = NOW(), mae = %s, mape = %s
        WHERE id = %s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (mae, mape, job_id))
        conn.commit()


def mark_training_error(job_id: int, msg: str) -> None:
    """Mark ml_training_job as error or back to pending if retryable."""
    sql = """
        UPDATE ml_training_jobs SET
            error_msg = %s,
            status = CASE WHEN attempts >= 3 THEN 'error' ELSE 'pending' END,
            started_at = NULL
        WHERE id = %s
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (msg[:500], job_id))
        conn.commit()


def release_stuck_jobs() -> None:
    """Release ml_training_jobs stuck in 'running' for more than 10 minutes."""
    sql = """
        UPDATE ml_training_jobs SET status = 'pending', started_at = NULL
        WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes'
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()


def enqueue_all_tenants() -> int:
    """Insert ml_training_jobs for all active tenants (startup auto-enqueue)."""
    tenants = get_all_tenants()
    if not tenants:
        return 0
    sql = "INSERT INTO ml_training_jobs (tenant_id) VALUES %s"
    values = [(t,) for t in tenants]
    with get_connection() as conn:
        with conn.cursor() as cur:
            psycopg2.extras.execute_values(cur, sql, values)
        conn.commit()
    logger.info(f"Auto-enqueued {len(tenants)} ml_training_jobs on startup")
    return len(tenants)


# ──────────────────────────────────────────────────────────
# Main — polling loop replaces schedule
# ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("ML Trainer starting — polling ml_training_jobs queue")

    # Enqueue jobs for all active tenants on startup (replaces "run once on startup")
    enqueue_all_tenants()

    while True:
        try:
            release_stuck_jobs()
            job = next_training_job()

            if job is None:
                logger.debug("No pending jobs — sleeping 60s")
                time.sleep(60)
                continue

            job_id = job["id"]
            tenant_id = str(job["tenant_id"])
            logger.info(f"Processing job={job_id} tenant={tenant_id}")

            try:
                df = load_tenant_data(tenant_id)

                if df.empty:
                    logger.warning(f"[{tenant_id}] No spending data — skipping job")
                    with get_connection() as conn:
                        save_model_meta(conn, tenant_id, {
                            "months_of_history": 0,
                            "num_categories": 0,
                            "mae": None,
                            "mape": None,
                            "status": "insufficient_data",
                            "error_message": "No spending data available",
                        })
                    mark_training_done(job_id, 0.0, 0.0)
                    continue

                months_of_history = df[["year", "month"]].drop_duplicates().shape[0]
                num_categories = df["category_pt"].nunique()

                if months_of_history < 3:
                    logger.warning(f"[{tenant_id}] Only {months_of_history} month(s) — skipping job")
                    with get_connection() as conn:
                        save_model_meta(conn, tenant_id, {
                            "months_of_history": months_of_history,
                            "num_categories": num_categories,
                            "mae": None,
                            "mape": None,
                            "status": "insufficient_data",
                            "error_message": f"Insufficient history: {months_of_history} month(s) (minimum 3)",
                        })
                    mark_training_done(job_id, 0.0, 0.0)
                    continue

                logger.info(f"[{tenant_id}] {months_of_history} months, {num_categories} categories — training...")
                df_features = compute_features(df)
                pipeline, mae, mape = train_model(df_features)

                predictions = generate_predictions(pipeline, df_features, tenant_id)
                with get_connection() as conn:
                    save_predictions(conn, predictions)
                    save_model_meta(conn, tenant_id, {
                        "months_of_history": months_of_history,
                        "num_categories": num_categories,
                        "mae": round(mae, 4),
                        "mape": round(mape, 4),
                        "status": "ok",
                        "error_message": None,
                    })

                mark_training_done(job_id, round(mae, 4), round(mape, 4))
                logger.info(f"[{tenant_id}] Done. job={job_id} MAE={mae:.2f} MAPE={mape:.2f}%")

            except Exception as exc:  # noqa: BLE001
                logger.error(f"[{tenant_id}] Training failed: {exc}", exc_info=True)
                mark_training_error(job_id, str(exc))

        except Exception as exc:  # noqa: BLE001
            logger.error(f"Polling loop error: {exc}", exc_info=True)
            time.sleep(10)

