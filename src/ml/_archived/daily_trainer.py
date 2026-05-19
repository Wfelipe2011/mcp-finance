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
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

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

def compute_base_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adiciona features temporais base: dia da semana, mês e fim de semana.
    Não inclui agregações (calculadas separadamente para evitar data leakage).
    """
    df = df.copy()
    df["day_of_week"] = df["transaction_date"].dt.dayofweek  # 0=seg, 6=dom
    df["month_of_year"] = df["transaction_date"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    return df


def compute_aggregate_features(df_train: pd.DataFrame, df_apply: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula médias históricas APENAS a partir de df_train (sem data leakage).
    Aplica as médias em df_apply via left join.
    Fallback: se a combinação não existe no treino, usa média geral da categoria.
    """
    # Média e mediana por categoria — mediana é mais robusta a outliers
    cat_stats = df_train.groupby("category_pt")["actual_amount"].agg(
        avg_cat="mean",
        median_cat="median",
        std_cat="std",
        count_cat="count",
    ).fillna(0)
    cat_stats["cv_cat"] = (cat_stats["std_cat"] / (cat_stats["avg_cat"] + 1e-9)).clip(0, 5)

    # Mediana por (categoria, mês) — menos sensível a compras pontuais grandes
    cat_month_avg = (
        df_train.groupby(["category_pt", "month_of_year"])["actual_amount"]
        .median().rename("avg_cat_month")
    )

    # Mediana por (categoria, dia da semana) — padrão semanal
    cat_dow_avg = (
        df_train.groupby(["category_pt", "day_of_week"])["actual_amount"]
        .median().rename("avg_cat_dow")
    )

    # Frequência de ocorrência por (categoria, mês) — proxy de consistência
    cat_month_cnt = (
        df_train.groupby(["category_pt", "month_of_year"])["actual_amount"]
        .count().rename("count_cat_month")
    )

    df_out = df_apply.copy()
    df_out = df_out.merge(
        cat_stats[["avg_cat", "median_cat", "cv_cat", "count_cat"]].reset_index(),
        on="category_pt", how="left"
    )
    df_out = df_out.merge(cat_month_avg.reset_index(), on=["category_pt", "month_of_year"], how="left")
    df_out = df_out.merge(cat_dow_avg.reset_index(), on=["category_pt", "day_of_week"], how="left")
    df_out = df_out.merge(cat_month_cnt.reset_index(), on=["category_pt", "month_of_year"], how="left")

    # Fallback para combinações sem histórico
    df_out["avg_cat_month"] = df_out["avg_cat_month"].fillna(df_out["median_cat"])
    df_out["avg_cat_dow"] = df_out["avg_cat_dow"].fillna(df_out["median_cat"])
    df_out["avg_cat"] = df_out["avg_cat"].fillna(0.0)
    df_out["median_cat"] = df_out["median_cat"].fillna(0.0)
    df_out["cv_cat"] = df_out["cv_cat"].fillna(1.0)
    df_out["count_cat"] = df_out["count_cat"].fillna(0.0)
    df_out["count_cat_month"] = df_out["count_cat_month"].fillna(0.0)

    return df_out


# ──────────────────────────────────────────────────────────
# Task 3.3 — stratified_split
# ──────────────────────────────────────────────────────────

def stratified_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split 80/20 estratificado por categoria, usando as transações mais recentes como teste.
    Para cada categoria: ordena por data descendente e reserva max(1, int(n*0.20))
    registros mais recentes para teste — o restante (mais antigos) vai para treino.
    Garante que todas as categorias apareçam em ambos os conjuntos.
    """
    train_frames = []
    test_frames = []

    for cat in df["category_pt"].unique():
        cat_df = df[df["category_pt"] == cat].sort_values("transaction_date", ascending=False)
        n = len(cat_df)
        n_test = max(1, int(n * 0.20))
        test_frames.append(cat_df.iloc[:n_test])   # mais recentes → teste
        train_frames.append(cat_df.iloc[n_test:])  # mais antigos  → treino

    df_test = pd.concat(test_frames).reset_index(drop=True)
    df_train = pd.concat(train_frames).reset_index(drop=True)
    return df_train, df_test


# ──────────────────────────────────────────────────────────
# Task 3.4 — train_daily_model
# ──────────────────────────────────────────────────────────

FEATURE_COLS = [
    "category_pt", "group_pt",
    "day_of_week", "month_of_year", "is_weekend",
    "avg_cat", "median_cat", "avg_cat_month", "avg_cat_dow",
    "cv_cat", "count_cat", "count_cat_month",
]
CAT_FEATURES = ["category_pt", "group_pt"]
NUM_FEATURES = [c for c in FEATURE_COLS if c not in CAT_FEATURES]


def train_daily_model(df_train: pd.DataFrame) -> tuple:
    """
    Treina pipeline com ColumnTransformer (OneHotEncoder) + RandomForestRegressor.
    Retorna (pipeline, mae_train, mape_train).
    """
    feature_cols = FEATURE_COLS
    target_col = "actual_amount"

    cat_features = CAT_FEATURES
    num_features = NUM_FEATURES

    # OrdinalEncoder é compatível com HistGradientBoosting (não precisa de OHE)
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), cat_features),
            ("num", "passthrough", num_features),
        ]
    )

    # TransformedTargetRegressor aplica log1p no alvo antes de treinar
    # e expm1 automaticamente na predição → reduz impacto de outliers de alto valor
    base_model = HistGradientBoostingRegressor(
        max_iter=300,
        max_depth=6,
        min_samples_leaf=5,
        learning_rate=0.05,
        random_state=42,
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", TransformedTargetRegressor(
            regressor=base_model,
            func=np.log1p,
            inverse_func=np.expm1,
        )),
    ])

    X_train = df_train[feature_cols]
    y_train = df_train[target_col]

    # Pesos de decaimento exponencial: dados mais recentes têm maior peso
    # Half-life de 90 dias → transações de 6 meses atrás valem ~13% do peso de hoje
    max_date = df_train["transaction_date"].max()
    days_ago = (max_date - df_train["transaction_date"]).dt.days.clip(0)
    sample_weight = np.exp(-days_ago / 90.0)

    pipeline.fit(X_train, y_train, regressor__sample_weight=sample_weight)

    y_pred_train = pipeline.predict(X_train)
    mae_train = float(mean_absolute_error(y_train, y_pred_train))
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
    feature_cols = FEATURE_COLS

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
    # Acurácia geral: previsão dentro de ±100% do valor real
    accuracy_pct = float(np.mean(np.abs(deviation_pcts) < 100))

    # Acurácia em categorias estáveis (cv_cat <= 1.5): exclui categorias altamente voláteis
    if "cv_cat" in df_test.columns:
        stable_mask = df_test["cv_cat"].values <= 1.5
        if stable_mask.any():
            accuracy_stable = float(np.mean(np.abs(deviation_pcts[stable_mask]) < 100))
            logger.info(
                f"Acurácia categorias estáveis (cv≤1.5): {accuracy_stable:.1%} "
                f"({stable_mask.sum()}/{len(stable_mask)} registros)"
            )

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

    # Calcular agregações do histórico completo para usar como features de previsão
    cat_stats = df_full.groupby("category_pt")["actual_amount"].agg(
        avg_cat="mean", median_cat="median", std_cat="std", count_cat="count"
    ).fillna(0)
    cat_stats["cv_cat"] = (cat_stats["std_cat"] / (cat_stats["avg_cat"] + 1e-9)).clip(0, 5)

    cat_month_avg = df_full.groupby(["category_pt", "month_of_year"])["actual_amount"].median()
    cat_month_cnt = df_full.groupby(["category_pt", "month_of_year"])["actual_amount"].count()
    cat_dow_avg = df_full.groupby(["category_pt", "day_of_week"])["actual_amount"].median()
    cat_groups = df_full.groupby("category_pt")["group_pt"].first()

    today = date.today()
    predictions = []

    for cat in df_full["category_pt"].unique():
        for day_offset in range(1, days + 1):
            pred_date = today + timedelta(days=day_offset)
            dow = pred_date.weekday()
            month = pred_date.month
            avg_c = float(cat_stats["avg_cat"].get(cat, 0))
            med_c = float(cat_stats["median_cat"].get(cat, 0))
            cv_c = float(cat_stats["cv_cat"].get(cat, 1))
            cnt_c = float(cat_stats["count_cat"].get(cat, 0))
            avg_cm = float(cat_month_avg.get((cat, month), med_c))
            cnt_cm = float(cat_month_cnt.get((cat, month), 0))
            avg_cd = float(cat_dow_avg.get((cat, dow), med_c))
            row = {
                "category_pt": cat,
                "group_pt": str(cat_groups.get(cat, "")),
                "day_of_week": dow,
                "month_of_year": month,
                "is_weekend": int(dow >= 5),
                "avg_cat": avg_c,
                "median_cat": med_c,
                "avg_cat_month": avg_cm,
                "avg_cat_dow": avg_cd,
                "cv_cat": cv_c,
                "count_cat": cnt_c,
                "count_cat_month": cnt_cm,
            }
            predictions.append((pred_date, row))

    if not predictions:
        return

    feature_cols = FEATURE_COLS
    pred_df = pd.DataFrame([r for _, r in predictions])
    amounts = pipeline.predict(pred_df[feature_cols])

    # Bounds: ±40% do valor previsto (intervalo de confiança simples)
    lower = amounts * 0.60
    upper = amounts * 1.40

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
        probability = float(min(1.0, max(0.0, float(amounts[i]) / (float(amounts[i]) + 50 + 1e-9))))
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

        # Features temporais base (sem leakage)
        df = compute_base_features(df)

        # Split estratificado ANTES das agregações para evitar data leakage
        df_train_base, df_test_base = stratified_split(df)

        # Agregações calculadas APENAS no treino, aplicadas a treino e teste
        df_train = compute_aggregate_features(df_train_base, df_train_base)
        df_test = compute_aggregate_features(df_train_base, df_test_base)
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
