/**
 * unified-worker — consome job_queue processando todos os tipos de job
 * (enrich, digest, forecast, daily_insight) em ordem de priority_score.
 * Suporta múltiplos workers concorrentes via claim_next_job (SKIP LOCKED).
 */
import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { handleEnrich } from "./handlers/enrich.ts";
import { handleDigest } from "./handlers/digest.ts";
import { handleForecast } from "./handlers/forecast.ts";
import { handleDailyInsight } from "./handlers/daily-insight.ts";

const WORKER_ID: string = process.env["WORKER_ID"] ?? crypto.randomUUID();

const db = new BunPgAdapter();

console.log(`[unified-worker:${WORKER_ID}] starting`);

async function loop(): Promise<void> {
  // Libera jobs presos por workers que morreram (> 10 min rodando)
  await db.jobQueue.releaseStuck();

  const job = await db.jobQueue.claimNext(WORKER_ID);

  if (!job) {
    await Bun.sleep(10_000);
    return loop();
  }

  const { job_id: jobId, job_type: jobType, tenant_id: tenantId, payload, ref_date: refDate, attempts } = job;

  console.log(`[unified-worker:${WORKER_ID}] claimed job=${jobId} type=${jobType} tenant=${tenantId} ref_date=${refDate} attempts=${attempts}`);

  try {
    let result: Awaited<ReturnType<typeof handleEnrich>>;

    switch (jobType) {
      case "enrich":
        result = await handleEnrich(db, tenantId, payload as { transaction_id: string; date?: string });
        break;
      case "digest":
        result = await handleDigest(db, tenantId, payload as { year: number; month: number });
        break;
      case "forecast":
        result = await handleForecast(db, tenantId, payload as { job_date: string });
        break;
      case "daily_insight":
        result = await handleDailyInsight(db, tenantId, payload as { job_date: string });
        break;
      default:
        result = { result: "error", error: `unknown job_type: ${jobType}` };
    }

    if (result.result === "done") {
      await db.jobQueue.markDone(jobId);
      console.log(`[unified-worker:${WORKER_ID}] done job=${jobId} type=${jobType}`);
    } else if (result.result === "skipped") {
      await db.jobQueue.markSkipped(jobId);
      console.log(`[unified-worker:${WORKER_ID}] skipped job=${jobId} type=${jobType}`);
    } else {
      await db.jobQueue.markError(jobId, result.error);
      console.error(`[unified-worker:${WORKER_ID}] error job=${jobId} type=${jobType}: ${result.error}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[unified-worker:${WORKER_ID}] unhandled error job=${jobId}: ${errMsg}`);
    try {
      await db.jobQueue.markError(jobId, errMsg);
    } catch {
      // ignore secondary failure
    }
  }

  return loop();
}

await loop();
