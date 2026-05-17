/**
 * Worker compartilhado — consome enrich_jobs, digest_jobs e forecast_jobs
 * em round-robin com fallback para fila não vazia.
 * Processa um job por iteração.
 */
import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { enrichTransaction } from "../../infrastructure/ai/enrichAgent.ts";
import { generateDigest } from "../../infrastructure/ai/digestAgent.ts";
import { generateForecastMessage } from "../../infrastructure/ai/forecastAgent.ts";
import { isDigestEligible } from "../../domain/digest-policy.ts";

const WORKER_ID = process.env["WORKER_ID"];
if (!WORKER_ID) throw new Error("WORKER_ID env var is required");
const workerId: string = WORKER_ID;

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

const db = new BunPgAdapter();

console.log(`[shared-worker:${workerId}] starting`);

// Round-robin: 0=enrich, 1=digest, 2=forecast
type QueueKind = "enrich" | "digest" | "forecast";
const QUEUE_ORDER: QueueKind[] = ["enrich", "digest", "forecast"];
let rotationIndex = 0;

// ── Handlers por tipo de fila ─────────────────────────────────────────────

async function handleEnrich(): Promise<boolean> {
  await db.enrich_jobs.releaseStuck();
  const job = await db.enrich_jobs.nextJob(workerId);
  if (!job) return false;

  const { id: jobId, tenant_id: tenantId, transaction_id: transactionId, attempts } = job;
  console.log(`[shared-worker:${workerId}] [enrich] job=${jobId} tenant=${tenantId} tx=${transactionId}`);

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const tx = await dbTenant.aiInsights.getUnenrichedById(transactionId);
    if (!tx) {
      console.error(`[shared-worker:${workerId}] [enrich] job=${jobId} transaction not found — marking error`);
      await db.enrich_jobs.markError(jobId, "transaction not found in f_transacoes");
      return true;
    }

    const insight = await enrichTransaction(tx);
    if (!insight) {
      const errMsg = "AI did not return a valid structure";
      console.error(`[shared-worker:${workerId}] [enrich] job=${jobId} ${errMsg}`);
      await db.enrich_jobs.markError(jobId, errMsg);
      return true;
    }

    await dbTenant.aiInsights.upsertOne({
      transaction_id: transactionId,
      model_version: AI_MODEL,
      ...insight,
    });

    await db.enrich_jobs.markDone(jobId, workerId);
    console.log(`[shared-worker:${workerId}] [enrich] done job=${jobId} attempts=${attempts}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[shared-worker:${workerId}] [enrich] job=${jobId} error: ${errMsg}`);
    await db.enrich_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }
  return true;
}

async function handleDigest(): Promise<boolean> {
  await db.digest_jobs.releaseStuck();
  const job = await db.digest_jobs.nextJob(workerId);
  if (!job) return false;

  const { id: jobId, tenant_id: tenantId, year, month } = job;
  console.log(`[shared-worker:${workerId}] [digest] job=${jobId} tenant=${tenantId} ${year}-${String(month).padStart(2, "0")}`);

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const coverage = await dbTenant.getDigestCoverage(year, month);

    if (!isDigestEligible(coverage.enriched, coverage.total)) {
      console.log(`[shared-worker:${workerId}] [digest] job=${jobId} coverage=${coverage.enriched}/${coverage.total} < 80% — skipping`);
      await db.digest_jobs.markSkipped(jobId);
      return true;
    }

    const insights = await dbTenant.aiDigests.getMonthInsights(year, month);
    const previousDigests = await dbTenant.aiDigests.getPreviousDigests(year, month, 3);

    const cashflow_real = insights
      .filter((r) => !r.is_debt_related)
      .reduce((sum, r) => sum + Number(r.amount_signed), 0);

    const debt_inflows = insights
      .filter((r) => r.is_debt_related && r.transaction_kind === "INCOME")
      .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

    const debt_payments = insights
      .filter((r) => r.is_debt_related && r.transaction_kind === "EXPENSE")
      .reduce((sum, r) => sum + Math.abs(Number(r.amount_signed)), 0);

    const enrichment_coverage = coverage.total > 0 ? coverage.enriched / coverage.total : 0;

    const digestResult = await generateDigest({
      year,
      month,
      cashflow_real,
      debt_inflows,
      debt_payments,
      enrichment_coverage,
      insights,
      previousDigests,
    });

    await dbTenant.upsertDigest(year, month, {
      year,
      month,
      cashflow_real,
      debt_inflows,
      debt_payments,
      enrichment_coverage,
      model_version: AI_MODEL,
      ...digestResult,
    });

    await db.digest_jobs.markDone(jobId);
    console.log(`[shared-worker:${workerId}] [digest] done job=${jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[shared-worker:${workerId}] [digest] job=${jobId} error: ${errMsg}`);
    await db.digest_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }
  return true;
}

async function handleForecast(): Promise<boolean> {
  await db.forecast_jobs.releaseStuck();
  const job = await db.forecast_jobs.nextJob(workerId);
  if (!job) return false;

  const { id: jobId, tenant_id: tenantId, job_date } = job;
  console.log(`[shared-worker:${workerId}] [forecast] job=${jobId} tenant=${tenantId} date=${job_date}`);

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const predictions = await dbTenant.forecast.getPredictionsByGroup();

    if (predictions.length === 0) {
      console.log(`[shared-worker:${workerId}] [forecast] job=${jobId} no predictions — marking error`);
      await db.forecast_jobs.markError(jobId, "no predictions available for tenant");
      return true;
    }

    const now = new Date(job_date);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const spending = await dbTenant.forecast.getCurrentMonthSpendingByGroup();

    const message = await generateForecastMessage({
      currentYear,
      currentMonth,
      spending,
      predictions,
    });

    const contextJson = {
      spending,
      predictions,
      currentYear,
      currentMonth,
    };

    await dbTenant.forecast.saveDailyMessage(job_date, message, contextJson, AI_MODEL);

    await db.forecast_jobs.markDone(jobId);
    console.log(`[shared-worker:${workerId}] [forecast] done job=${jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[shared-worker:${workerId}] [forecast] job=${jobId} error: ${errMsg}`);
    await db.forecast_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }
  return true;
}

const handlers: Record<QueueKind, () => Promise<boolean>> = {
  enrich: handleEnrich,
  digest: handleDigest,
  forecast: handleForecast,
};

// ── Loop principal — round-robin com fallback ─────────────────────────────

async function loop(): Promise<void> {
  // Tenta na fila da vez e nas demais como fallback
  let processed = false;
  for (let attempt = 0; attempt < QUEUE_ORDER.length; attempt++) {
    const kind = QUEUE_ORDER[(rotationIndex + attempt) % QUEUE_ORDER.length]!;
    const didProcess = await handlers[kind]();
    if (didProcess) {
      processed = true;
      // Avança rotação para a próxima fila na próxima iteração (fairness)
      rotationIndex = (rotationIndex + attempt + 1) % QUEUE_ORDER.length;
      break;
    }
  }

  if (!processed) {
    // Todas as filas vazias — aguarda antes de tentar novamente
    rotationIndex = (rotationIndex + 1) % QUEUE_ORDER.length;
    await Bun.sleep(10_000);
  }

  return loop();
}

await loop();
