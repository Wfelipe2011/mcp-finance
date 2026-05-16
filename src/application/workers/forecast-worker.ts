import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { generateForecastMessage } from "../../infrastructure/ai/forecastAgent.ts";

const WORKER_ID = process.env["WORKER_ID"];
if (!WORKER_ID) throw new Error("WORKER_ID env var is required");
const workerId: string = WORKER_ID;

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

// Worker uses BunPgAdapter without tenantId — forecast_jobs has no RLS
const db = new BunPgAdapter();

console.log(`[forecast-worker:${workerId}] starting`);

async function loop(): Promise<void> {
  // Release stuck jobs from dead workers before picking next job
  await db.forecast_jobs.releaseStuck();

  const job = await db.forecast_jobs.nextJob(workerId);

  if (!job) {
    await Bun.sleep(10_000);
    return loop();
  }

  const { id: jobId, tenant_id: tenantId, job_date } = job;

  console.log(`[forecast-worker:${workerId}] job=${jobId} tenant=${tenantId} date=${job_date}`);

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const predictions = await dbTenant.forecast.getPredictionsByGroup();

    if (predictions.length === 0) {
      console.log(`[forecast-worker:${workerId}] job=${jobId} no predictions — marking error`);
      await db.forecast_jobs.markError(jobId, "no predictions available for tenant");
      return loop();
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
    console.log(`[forecast-worker:${workerId}] done job=${jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[forecast-worker:${workerId}] job=${jobId} error: ${errMsg}`);
    await db.forecast_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }

  return loop();
}

await loop();
