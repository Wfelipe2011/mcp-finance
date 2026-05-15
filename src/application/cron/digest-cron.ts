import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { generateDigest } from "../../infrastructure/ai/digestAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

async function runDigestCron(): Promise<void> {
  const rootDb = new BunPgAdapter();
  const tenantIds = await rootDb.getActiveTenantsIds();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  console.log(
    `[cron] Starting digest run for ${year}-${String(month).padStart(2, "0")} — ${tenantIds.length} active tenant(s)`
  );

  for (const tenantId of tenantIds) {
    const db = new BunPgAdapter(tenantId);
    try {
      const coverage = await db.getDigestCoverage(year, month);

      if (coverage.total === 0 || coverage.enriched < coverage.total) {
        console.log(`[cron] tenant=${tenantId} coverage=${coverage.enriched}/${coverage.total} — skipped`);
        continue;
      }

      const insights = await db.aiDigests.getMonthInsights(year, month);
      const previousDigests = await db.aiDigests.getPreviousDigests(year, month, 3);

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

      await db.upsertDigest(year, month, {
        year,
        month,
        cashflow_real,
        debt_inflows,
        debt_payments,
        enrichment_coverage,
        model_version: AI_MODEL,
        ...digestResult,
      });

      console.log(`[cron] tenant=${tenantId} digest=generated`);
    } catch (err) {
      console.error(`[cron] tenant=${tenantId} error:`, err);
    }
  }
}

function scheduleNext(): void {
  const now = new Date();
  const next = new Date();
  next.setHours(23, 50, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[cron] Next digest run in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await runDigestCron();
    scheduleNext();
  }, delay);
}

console.log("[cron] digest-cron started");
scheduleNext();
