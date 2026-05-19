import { SQL } from "bun";
import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { generateDailyInsightMessage } from "../../infrastructure/ai/forecastAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";
const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const rootSql = new SQL(DATABASE_URL);

console.log("[daily-insight-worker] starting");

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSuggestedAction(category: string): string {
  const map: Record<string, string> = {
    "Delivery de comida": "cook_at_home",
    "Restaurantes": "plan_meals_ahead",
    "Alimentação e bebidas": "meal_prep",
    "Mercado e supermercado": "check_pantry_first",
    "Táxi e aplicativos": "use_public_transport",
    "Postos de combustível": "plan_trips",
    "Transporte": "use_public_transport",
    "Compras": "compare_prices",
    "Compras online": "wait_24h_before_buying",
    "Bem-estar e fitness": "check_subscription",
    "Streaming de vídeo": "audit_subscriptions",
    "Serviços digitais": "audit_subscriptions",
  };
  return map[category] ?? "review_spending";
}

async function claimNextJob(): Promise<{ id: number; tenant_id: string; job_date: string } | null> {
  // Liberar jobs travados por mais de 10 minutos
  await rootSql`
    UPDATE daily_insight_jobs SET status = 'pending', started_at = NULL
    WHERE status = 'running' AND started_at < NOW() - INTERVAL '10 minutes'
  `;

  const rows = await rootSql<{ id: number; tenant_id: string; job_date: string }[]>`
    WITH next AS (
      SELECT id, tenant_id, job_date
      FROM daily_insight_jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE daily_insight_jobs SET
      status = 'running',
      started_at = NOW(),
      attempts = attempts + 1
    FROM next
    WHERE daily_insight_jobs.id = next.id
    RETURNING daily_insight_jobs.id, daily_insight_jobs.tenant_id, daily_insight_jobs.job_date
  `;
  return rows[0] ?? null;
}

async function markJobDone(jobId: number): Promise<void> {
  await rootSql`
    UPDATE daily_insight_jobs SET status = 'done', finished_at = NOW() WHERE id = ${jobId}
  `;
}

async function markJobError(jobId: number, msg: string): Promise<void> {
  await rootSql`
    UPDATE daily_insight_jobs SET
      status = 'error',
      error_msg = ${msg},
      finished_at = NOW()
    WHERE id = ${jobId}
  `;
}

async function loop(): Promise<void> {
  const job = await claimNextJob();

  if (!job) {
    await Bun.sleep(10_000);
    return loop();
  }

  const { id: jobId, tenant_id: tenantId, job_date } = job;
  const today = todayIso();

  console.log(`[daily-insight-worker] job=${jobId} tenant=${tenantId} date=${job_date}`);

  const dbTenant = new BunPgAdapter(tenantId);

  try {
    // Buscar sinais de hábito diário e previsões do dia
    const signals = await dbTenant.forecast.getDailyHabitSignals(today);
    const predictions = await dbTenant.forecast.getDailyPrediction(today);

    // Selecionar top categoria: probability >= 0.3 E occurrences_6m >= 3
    const candidates = predictions.filter((p) => {
      const signal = signals.find((s) => s.category_pt === p.category_pt);
      return p.probability >= 0.3 && signal && signal.occurrences_6m >= 3;
    });

    if (candidates.length === 0) {
      console.log(
        `[daily-insight-worker] job=${jobId} status=no_signal — no category meets threshold`
      );
      await markJobDone(jobId);
      return loop();
    }

    // Candidato principal (já ordenado por probability DESC em getDailyPrediction)
    const top = candidates[0]!;
    const topSignal = signals.find((s) => s.category_pt === top.category_pt)!;

    const context = {
      insight_type: "spending_pattern",
      category_pt: top.category_pt,
      group_pt: top.group_pt,
      occurrences: topSignal.occurrences,
      avg_amount: topSignal.avg_amount,
      probability: top.probability,
      suggested_action_type: getSuggestedAction(top.category_pt),
      occurrences_6m: topSignal.occurrences_6m,
    };

    const message = await generateDailyInsightMessage(context);

    const secondaryInsights = candidates.slice(1, 4).map((p) => ({
      category_pt: p.category_pt,
      group_pt: p.group_pt,
      probability: p.probability,
      estimated_amount: p.predicted_amount,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    }));

    const contextJson = {
      insight_type: context.insight_type,
      category_pt: context.category_pt,
      group_pt: context.group_pt,
      occurrences: context.occurrences,
      avg_amount: context.avg_amount,
      probability: context.probability,
      suggested_action_type: context.suggested_action_type,
      occurrences_6m: context.occurrences_6m,
      estimated_amount: top.predicted_amount,
      lower_bound: top.lower_bound,
      upper_bound: top.upper_bound,
      signal_count: signals.length,
      secondary_insights: secondaryInsights,
    };

    await dbTenant.forecast.saveDailyInsightMessage(
      today,
      message,
      contextJson,
      AI_MODEL,
      "daily_insight"
    );

    await markJobDone(jobId);
    console.log(`[daily-insight-worker] done job=${jobId} category=${top.category_pt}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[daily-insight-worker] job=${jobId} error: ${errMsg}`);
    await markJobError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }

  return loop();
}

await loop();
