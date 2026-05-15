import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { enrichTransaction } from "../../infrastructure/ai/enrichAgent.ts";

const WORKER_ID = process.env["WORKER_ID"];
if (!WORKER_ID) throw new Error("WORKER_ID env var is required");
const workerId: string = WORKER_ID;

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

// Worker uses BunPgAdapter without tenantId — enrich_jobs has no RLS
const db = new BunPgAdapter();

console.log(`[worker:${workerId}] starting`);

async function loop(): Promise<void> {
  // Release stuck jobs from dead workers before picking next job
  await db.enrich_jobs.releaseStuck();

  const job = await db.enrich_jobs.nextJob(workerId);

  if (!job) {
    await Bun.sleep(5000);
    return loop();
  }

  const { id: jobId, tenant_id: tenantId, transaction_id: transactionId, attempts } = job;

  console.log(`[worker:${workerId}] job=${jobId} tenant=${tenantId} tx=${transactionId}`);

  // Instantiate tenant-scoped adapter for RLS-protected access
  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const tx = await dbTenant.aiInsights.getUnenrichedById(transactionId);

    if (!tx) {
      console.error(`[worker:${workerId}] job=${jobId} transaction not found — marking error`);
      await db.enrich_jobs.markError(jobId, "transaction not found in f_transacoes");
      return loop();
    }

    const insight = await enrichTransaction(tx);

    if (!insight) {
      const errMsg = "AI did not return a valid structure";
      console.error(`[worker:${workerId}] job=${jobId} ${errMsg}`);
      await db.enrich_jobs.markError(jobId, errMsg);
      return loop();
    }

    await dbTenant.aiInsights.upsertOne({
      transaction_id: transactionId,
      model_version: AI_MODEL,
      ...insight,
    });

    await db.enrich_jobs.markDone(jobId, workerId);
    console.log(`[worker:${workerId}] done job=${jobId} attempts=${attempts}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[worker:${workerId}] job=${jobId} error: ${errMsg}`);
    await db.enrich_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }

  return loop();
}

await loop();
