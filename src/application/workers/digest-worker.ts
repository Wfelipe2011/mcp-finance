import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { generateDigest } from "../../infrastructure/ai/digestAgent.ts";
import { isDigestEligible } from "../../domain/digest-policy.ts";

const WORKER_ID = process.env["WORKER_ID"];
if (!WORKER_ID) throw new Error("WORKER_ID env var is required");
const workerId: string = WORKER_ID;

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

// Worker uses BunPgAdapter without tenantId — digest_jobs has no RLS
const db = new BunPgAdapter();

console.log(`[digest-worker:${workerId}] starting`);

async function loop(): Promise<void> {
  // Release stuck jobs from dead workers before picking next job
  await db.digest_jobs.releaseStuck();

  const job = await db.digest_jobs.nextJob(workerId);

  if (!job) {
    await Bun.sleep(10_000);
    return loop();
  }

  const { id: jobId, tenant_id: tenantId, year, month } = job;

  console.log(`[digest-worker:${workerId}] job=${jobId} tenant=${tenantId} ${year}-${String(month).padStart(2, "0")}`);

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    // Safety net: verify coverage is still >= 80%
    const coverage = await dbTenant.getDigestCoverage(year, month);

    if (!isDigestEligible(coverage.enriched, coverage.total)) {
      console.log(`[digest-worker:${workerId}] job=${jobId} coverage=${coverage.enriched}/${coverage.total} < 80% — skipping`);
      await db.digest_jobs.markSkipped(jobId);
      return loop();
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
    console.log(`[digest-worker:${workerId}] done job=${jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[digest-worker:${workerId}] job=${jobId} error: ${errMsg}`);
    await db.digest_jobs.markError(jobId, errMsg);
  } finally {
    await dbTenant.close();
  }

  return loop();
}

await loop();
