import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";

async function runDigestCron(): Promise<void> {
  const rootDb = new BunPgAdapter();
  const tenantIds = await rootDb.getActiveTenantsIds();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  console.log(
    `[cron] Starting digest enqueue for ${year}-${String(month).padStart(2, "0")} — ${tenantIds.length} active tenant(s)`
  );

  const toEnqueue: { id: string; year: number; month: number }[] = [];

  for (const tenantId of tenantIds) {
    const db = new BunPgAdapter(tenantId);
    try {
      const coverage = await db.getDigestCoverage(year, month);

      if (coverage.total === 0 || coverage.enriched < coverage.total) {
        console.log(`[cron] tenant=${tenantId} coverage=${coverage.enriched}/${coverage.total} — skipped`);
        continue;
      }

      toEnqueue.push({ id: tenantId, year, month });
      console.log(`[cron] tenant=${tenantId} coverage=100% — enqueuing`);
    } catch (err) {
      console.error(`[cron] tenant=${tenantId} error:`, err);
    } finally {
      await db.close();
    }
  }

  if (toEnqueue.length > 0) {
    const inserted = await rootDb.digest_jobs.enqueue(toEnqueue);
    console.log(`[cron] enqueued ${inserted} new digest job(s) (${toEnqueue.length} eligible tenant(s))`);
  }

  await rootDb.close();
}

function scheduleNext(): void {
  const now = new Date();
  const next = new Date();
  next.setHours(23, 50, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[cron] Next digest enqueue in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await runDigestCron();
    scheduleNext();
  }, delay);
}

console.log("[cron] digest-cron started (auto-enqueue mode)");
scheduleNext();

