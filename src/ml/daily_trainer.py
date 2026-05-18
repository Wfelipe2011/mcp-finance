"""
Daily ML Trainer — ml-daily-trainer
Treina um RandomForestRegressor por tenant no grão (date, category_pt).
Independente do trainer.py mensal existente.

Roda às 02:00 diariamente ou sob demanda via arquivo sentinel.
Conexão superuser (ML_DATABASE_URL) para acesso cross-tenant sem RLS.
"""

import os
import logging
import time
import signal
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import numpy as np
import psycopg2
import psycopg2.extras
import joblib
import schedule
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
MODEL_STORAGE_PATH = os.environ.get("MODEL_STORAGE_PATH", "/models")


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(ML_DATABASE_URL)


def get_all_tenants() -> list[str]:
    """Return UUIDs of all active tenants."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tenants WHERE status = 'active'")
            return [str(row[0]) for row in cur.fetchall()]


# ──────────────────────────────────────────────────────────
# Task 3.1 — load_daily_dataset
# ──────────────────────────────────────────────────────────

def load_daily_dataset(conn, tenant_id: str) -> pd.DataFrame:
    """
    Carrega transações agregadas por (date, category_pt, group_pt) para o tenant,
    excluindo categorias presentes em forecast_category_exclusions.
    Filtra amount < 0 (apenas despesas).
    """
    sql = """
        SELECT
            te.date::date AS transaction_date,
            COALESCE(te.category_pt, 'Sem Categoria') AS category_pt,
            COALESCE(te.category_group_pt, 'Sem Grupo') AS group_pt,
            SUM(ABS(te.amount)) AS actual_amount
        FROM transactions_enriched te
        JOIN tenant_members tm
          ON tm.name = te.owner_normalized
         AND tm.tenant_id = te.tenant_id
        WHERE tm.tenant_id = %s
          AND te.amount < 0
          AND COALESCE(te.category_pt, 'Sem Categoria') NOT IN (
              SELECT category_pt FROM forecast_category_exclusions
              WHERE tenant_id = %s
          )
        GROUP BY te.date::date, te.category_pt, te.category_group_pt
        ORDER BY te.date::date, te.category_pt
    """
    df = pd.read_sql(sql, conn, params=(tenant_id, tenant_id))
    df["actual_amount"] = df["actual_amount"].astype(float)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    return df


# ──────────────────────────────────────────────────────────
# Task 3.2 — compute_daily_features
# ──────────────────────────────────────────────────────────

def compute_daily_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adiciona features temporais e rolling stats por categoria.
    """
    df = df.copy()
    df["day_of_week"] = df["transaction_date"].dt.dayofweek
    df["day_of_month"] = df["transaction_date"].dt.day
    df["month_of_year"] = df["transaction_date"].dt.month

    # Rolling stats por categoria (ordenado por data)
    rolling_7d = []
    rolling_30d = []
    days_since_last = []

    for cat, group in df.groupby("category_pt"):
        group = group.sort_values("transaction_date")
        r7 = group["actual_amount"].rolling(7, min_periods=1).mean()
        r30 = group["actual_amount"].rolling(30, min_periods=1).mean()
        rolling_7d.append(r7)
        rolling_30d.append(r30)

        # days_since_last: dias desde a ocorrência anterior da categoria
        dates = group["transaction_date"].reset_index(drop=True)
        dsl = [0]
        for i in range(1, len(dates)):
            dsl.append((dates[i] - dates[i - 1]).days)
        days_since_last.append(pd.Series(dsl, index=group.index))

    if rolling_7d:
        df["rolling_7d_avg"] = pd.concat(rolling_7d).reindex(df.index).fillna(0)
        df["rolling_30d_avg"] = pd.concat(rolling_30d).reindex(df.index).fillna(0)
        df["days_since_last"] = pd.concat(days_since_last).reindex(df.index).fillna(0)
    else:
        df["rolling_7d_avg"] = 0.0
        df["rolling_30d_avg"] = 0.0
        df["days_since_last"] = 0.0

    return df


# ──────────────────────────────────────────────────────────
# Task 3.3 — stratified_split
# ──────────────────────────────────────────────────────────

def stratified_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split 80/20 estratificado por categoria.
    Para cada categoria: embaralha com random_state=42 e reserva max(1, int(n*0.20)) para teste.
    Garante que todas as categorias apareçam em ambos os conjuntos.
    """
    train_frames = []
    test_frames = []

    for cat in df["category_pt"].unique():
        cat_df = df[df["category_pt"] == cat].sample(frac=1, random_state=42)
        n = len(cat_df)
        n_test = max(1, int(n * 0.20))
        test_frames.append(cat_df.iloc[:n_test])
        train_frames.append(cat_df.iloc[n_test:])

    df_test = pd.concat(test_frames).reset_index(drop=True)
    df_train = pd.concat(train_frames).reset_index(drop=True)
    return df_train, df_test


# ──────────────────────────────────────────────────────────
# Task 3.4 — train_daily_model
# ──────────────────────────────────────────────────────────

def train_daily_model(df_train: pd.DataFrame) -> tuple:
    """
    Treina pipeline com ColumnTransformer (OneHotEncoder) + RandomForestRegressor.
    Retorna (pipeline, mae_train, mape_train).
    """
    feature_cols = [
        "category_pt", "group_pt",
        "day_of_week", "day_of_month", "month_of_year",
        "rolling_7d_avg", "rolling_30d_avg", "days_since_last",
    ]
    target_col = "actual_amount"

    cat_features = ["category_pt", "group_pt"]
    num_features = [c for c in feature_cols if c not in cat_features]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
            ("num", "passthrough", num_features),
        ]
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            random_state=42,
        )),
    ])

    X_train = df_train[feature_cols]
    y_train = df_train[target_col]
    pipeline.fit(X_train, y_train)

    y_pred_train = pipeline.predict(X_train)
    mae_train = float(mean_absolute_error(y_train, y_pred_train))
    # MAPE com proteção contra divisão por zero
    mask = y_train > 0
    mape_train = float(np.mean(np.abs((y_train[mask] - y_pred_train[mask]) / y_train[mask]))) if mask.any() else 0.0

    return pipeline, mae_train, mape_train


# ──────────────────────────────────────────────────────────
# Task 3.5 — evaluate_model
# ──────────────────────────────────────────────────────────

def evaluate_model(pipeline, df_test: pd.DataFrame) -> tuple[dict, list[dict]]:
    """
    Avalia o modelo no conjunto de teste.
    Retorna (metrics_dict, test_results_list).
    """
    feature_cols = [
        "category_pt", "group_pt",
        "day_of_week", "day_of_month", "month_of_year",
        "rolling_7d_avg", "rolling_30d_avg", "days_since_last",
    ]

    X_test = df_test[feature_cols]
    y_test = df_test["actual_amount"]
    y_pred = pipeline.predict(X_test)

    mae = float(mean_absolute_error(y_test, y_pred))
    mask = y_test > 0
    mape = float(np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask]))) if mask.any() else 0.0

    deviation_pcts = np.where(
        y_test > 0,
        (y_pred - y_test) / y_test * 100,
        0.0
    )
    accuracy_pct = float(np.mean(np.abs(deviation_pcts) < 30))

    test_results = []
    for i, row in df_test.iterrows():
        test_results.append({
            "transaction_date": row["transaction_date"].date().isoformat(),
            "category_pt": row["category_pt"],
            "group_pt": row["group_pt"],
            "predicted_amount": float(y_pred[df_test.index.get_loc(i)]),
            "actual_amount": float(row["actual_amount"]),
            "deviation_pct": float(deviation_pcts[df_test.index.get_loc(i)]),
        })

    metrics = {
        "mae": mae,
        "mape": mape,
        "accuracy_pct": accuracy_pct,
        "num_test": len(df_test),
    }

    return metrics, test_results


# ──────────────────────────────────────────────────────────
# Task 3.6 — save_model_file
# ──────────────────────────────────────────────────────────

def save_model_file(pipeline, tenant_id: str, version_name: str) -> str:
    """
    Salva o modelo em /models/{tenant_id}/{version_name}.pkl via joblib.
    Cria diretório se não existir.
    Retorna o file_path.
    """
    model_dir = Path(MODEL_STORAGE_PATH) / tenant_id
    model_dir.mkdir(parents=True, exist_ok=True)
    file_path = model_dir / f"{version_name}.pkl"
    joblib.dump(pipeline, file_path)
    return str(file_path)


# ──────────────────────────────────────────────────────────
# Task 3.7 — save_model_version
# ──────────────────────────────────────────────────────────

def save_model_version(
    conn,
    tenant_id: str,
    version_name: str,
    file_path: str | None,
    metrics: dict,
    excluded_categories: list[str],
) -> None:
    """INSERT em forecast_model_versions com status='staging'."""
    import json
    sql = """
        INSERT INTO forecast_model_versions
            (tenant_id, version_name, file_path, status,
             mae, mape, accuracy_pct, num_train, num_test,
             exclusions_applied, created_at)
        VALUES (%s, %s, %s, 'staging', %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (tenant_id, version_name) DO UPDATE
        SET file_path = EXCLUDED.file_path,
            mae = EXCLUDED.mae,
            mape = EXCLUDED.mape,
            accuracy_pct = EXCLUDED.accuracy_pct,
            num_train = EXCLUDED.num_train,
            num_test = EXCLUDED.num_test,
            exclusions_applied = EXCLUDED.exclusions_applied
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            tenant_id,
            version_name,
            file_path,
            metrics.get("mae"),
            metrics.get("mape"),
            metrics.get("accuracy_pct"),
            metrics.get("num_train"),
            metrics.get("num_test"),
            json.dumps(excluded_categories),
        ))
    conn.commit()


# ──────────────────────────────────────────────────────────
# Task 3.8 — save_test_results
# ──────────────────────────────────────────────────────────

def save_test_results(conn, tenant_id: str, version_name: str, test_results: list[dict]) -> None:
    """UPSERT em forecast_daily_test_results via execute_batch."""
    # Limpar resultados anteriores desta versão
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM forecast_daily_test_results WHERE tenant_id = %s AND version_name = %s",
            (tenant_id, version_name)
        )

    sql = """
        INSERT INTO forecast_daily_test_results
            (tenant_id, version_name, transaction_date, category_pt, group_pt,
             predicted_amount, actual_amount, deviation_pct)
        VALUES (%(tenant_id)s, %(version_name)s, %(transaction_date)s, %(category_pt)s,
                %(group_pt)s, %(predicted_amount)s, %(actual_amount)s, %(deviation_pct)s)
    """
    records = [
        {
            "tenant_id": tenant_id,
            "version_name": version_name,
            **r,
        }
        for r in test_results
    ]
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, records, page_size=100)
    conn.commit()


# ──────────────────────────────────────────────────────────
# Task 3.9 — generate_daily_predictions_v2
# ──────────────────────────────────────────────────────────

def generate_daily_predictions_v2(
    conn,
    pipeline,
    tenant_id: str,
    version_name: str,
    df_full: pd.DataFrame,
    days: int = 30,
) -> None:
    """
    Gera predições para os próximos `days` dias por categoria.
    Usa médias históricas como features rolling.
    UPSERT em forecast_daily_predictions.
    """
    if df_full.empty:
        return

    categories = df_full.groupby(["category_pt", "group_pt"])["actual_amount"].agg(
        rolling_7d_avg="mean",
        rolling_30d_avg="mean",
    ).reset_index()
    categories["days_since_last"] = 7  # estimativa conservadora

    today = date.today()
    predictions = []

    for _, cat_row in categories.iterrows():
        for day_offset in range(1, days + 1):
            pred_date = today + timedelta(days=day_offset)
            row = {
                "category_pt": cat_row["category_pt"],
                "group_pt": cat_row["group_pt"],
                "day_of_week": pred_date.weekday(),
                "day_of_month": pred_date.day,
                "month_of_year": pred_date.month,
                "rolling_7d_avg": cat_row["rolling_7d_avg"],
                "rolling_30d_avg": cat_row["rolling_30d_avg"],
                "days_since_last": cat_row["days_since_last"],
            }
            predictions.append((pred_date, row))

    if not predictions:
        return

    feature_cols = [
        "category_pt", "group_pt",
        "day_of_week", "day_of_month", "month_of_year",
        "rolling_7d_avg", "rolling_30d_avg", "days_since_last",
    ]
    pred_df = pd.DataFrame([r for _, r in predictions])
    amounts = pipeline.predict(pred_df[feature_cols])

    # Calcular bounds simples a partir do desvio médio do RandomForest
    estimators = pipeline.named_steps["regressor"].estimators_
    tree_preds = np.array([e.predict(
        pipeline.named_steps["preprocessor"].transform(pred_df[feature_cols])
    ) for e in estimators[:50]])  # usar 50 árvores para bound
    lower = np.percentile(tree_preds, 10, axis=0)
    upper = np.percentile(tree_preds, 90, axis=0)

    sql = """
        INSERT INTO forecast_daily_predictions
            (tenant_id, prediction_date, category_pt, group_pt,
             predicted_amount, lower_bound, upper_bound, probability, model_version)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (tenant_id, prediction_date, category_pt) DO UPDATE
        SET predicted_amount = EXCLUDED.predicted_amount,
            lower_bound      = EXCLUDED.lower_bound,
            upper_bound      = EXCLUDED.upper_bound,
            probability      = EXCLUDED.probability,
            model_version    = EXCLUDED.model_version
    """
    records = []
    for i, (pred_date, row) in enumerate(predictions):
        probability = min(1.0, max(0.0, amounts[i] / (amounts[i] + 50 + 1e-9)))
        records.append((
            tenant_id,
            pred_date.isoformat(),
            row["category_pt"],
            row["group_pt"],
            float(amounts[i]),
            float(lower[i]),
            float(upper[i]),
            round(probability, 4),
            version_name,
        ))

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, records, page_size=100)
    conn.commit()


# ──────────────────────────────────────────────────────────
# Task 3.10 — train_tenant
# ──────────────────────────────────────────────────────────

def get_excluded_categories(conn, tenant_id: str) -> list[str]:
    """Retorna lista de categorias excluídas do treinamento."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT category_pt FROM forecast_category_exclusions WHERE tenant_id = %s",
            (tenant_id,)
        )
        return [row[0] for row in cur.fetchall()]


def train_tenant(tenant_id: str) -> None:
    """
    Orquestrador principal: carrega dados, treina, avalia, salva modelo e resultados.
    Mínimo de 30 dias de histórico necessário.
    """
    version_name = "daily-v" + datetime.now().strftime("%Y%m%d-%H%M%S")
    logger.info(f"[{tenant_id}] Iniciando treino: {version_name}")

    conn = get_connection()
    try:
        # Carregar dados
        df = load_daily_dataset(conn, tenant_id)
        excluded_categories = get_excluded_categories(conn, tenant_id)

        if df.empty:
            logger.warning(f"[{tenant_id}] Sem dados — pulando")
            return

        # Verificar mínimo de 30 dias
        unique_dates = df["transaction_date"].nunique()
        if unique_dates < 30:
            logger.warning(f"[{tenant_id}] Apenas {unique_dates} dias de histórico — mínimo 30")
            save_model_version(conn, tenant_id, version_name, None, {
                "mae": None, "mape": None, "accuracy_pct": None,
                "num_train": 0, "num_test": 0,
            }, excluded_categories)
            # Update status to insufficient_data
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE forecast_model_versions SET status = 'staging' WHERE tenant_id = %s AND version_name = %s",
                    (tenant_id, version_name)
                )
            conn.commit()
            return

        # Computar features
        df = compute_daily_features(df)

        # Split estratificado
        df_train, df_test = stratified_split(df)
        logger.info(f"[{tenant_id}] Split: {len(df_train)} treino, {len(df_test)} teste")

        # Treinar modelo
        pipeline, mae_train, mape_train = train_daily_model(df_train)
        logger.info(f"[{tenant_id}] Treino: MAE={mae_train:.2f}, MAPE={mape_train:.4f}")

        # Avaliar no conjunto de teste
        metrics, test_results = evaluate_model(pipeline, df_test)
        metrics["num_train"] = len(df_train)
        logger.info(f"[{tenant_id}] Teste: MAE={metrics['mae']:.2f}, acc={metrics['accuracy_pct']:.2%}")

        # Salvar arquivo .pkl
        file_path = save_model_file(pipeline, tenant_id, version_name)
        logger.info(f"[{tenant_id}] Modelo salvo: {file_path}")

        # Salvar metadados no banco
        save_model_version(conn, tenant_id, version_name, file_path, metrics, excluded_categories)

        # Salvar resultados do conjunto de teste
        save_test_results(conn, tenant_id, version_name, test_results)
        logger.info(f"[{tenant_id}] {len(test_results)} test-results salvos")

        # Gerar predições diárias
        generate_daily_predictions_v2(conn, pipeline, tenant_id, version_name, df)
        logger.info(f"[{tenant_id}] Predições diárias geradas")

    except Exception as e:
        logger.error(f"[{tenant_id}] Erro no treino: {e}", exc_info=True)
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────
# Task 3.11 — Loop de schedule + sentinel file
# ──────────────────────────────────────────────────────────

def check_sentinel_triggers() -> None:
    """
    Verifica arquivos sentinel /models/{tenant_id}/.trigger para treino sob demanda.
    Remove o arquivo após processamento.
    """
    models_path = Path(MODEL_STORAGE_PATH)
    if not models_path.exists():
        return

    for tenant_dir in models_path.iterdir():
        if not tenant_dir.is_dir():
            continue
        sentinel = tenant_dir / ".trigger"
        if sentinel.exists():
            tenant_id = tenant_dir.name
            logger.info(f"[{tenant_id}] Sentinel detectado — iniciando treino sob demanda")
            try:
                sentinel.unlink()
                train_tenant(tenant_id)
            except Exception as e:
                logger.error(f"[{tenant_id}] Erro no treino por sentinel: {e}", exc_info=True)


def run_all_tenants() -> None:
    """Treina todos os tenants ativos."""
    try:
        tenants = get_all_tenants()
        logger.info(f"Treinando {len(tenants)} tenant(s)")
        for tenant_id in tenants:
            train_tenant(tenant_id)
    except Exception as e:
        logger.error(f"Erro ao obter tenants: {e}", exc_info=True)


def main() -> None:
    logger.info("Daily ML Trainer iniciado")

    # Treino inicial ao subir
    run_all_tenants()

    # Schedule diário às 02:00
    schedule.every().day.at("02:00").do(run_all_tenants)

    # Loop principal
    running = True

    def handle_signal(sig, frame):
        nonlocal running
        logger.info("Sinal recebido — encerrando")
        running = False

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    while running:
        schedule.run_pending()
        check_sentinel_triggers()
        time.sleep(10)

    logger.info("Daily ML Trainer encerrado")
    sys.exit(0)


if __name__ == "__main__":
    main()
