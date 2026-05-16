import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function runForecastCron(): Promise<void> {
  const rootDb = new BunPgAdapter();
  const tenantIds = await rootDb.getActiveTenantsIds();
  const today = todayIso();

  console.log(
    `[forecast-cron] Starting enqueue for ${today} — ${tenantIds.length} active tenant(s)`
  );

  const tenants = tenantIds.map((id) => ({ id }));
  const inserted = await rootDb.forecast_jobs.enqueue(tenants, today);
  console.log(`[forecast-cron] enqueued ${inserted} new forecast job(s)`);

  await rootDb.close();
  console.log(`[forecast-cron] Enqueue complete`);
}

function scheduleNext(): void {
  const now = new Date();
  // 00:30 BRT = 03:30 UTC
  const next = new Date();
  next.setUTCHours(3, 30, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[forecast-cron] Next enqueue in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await runForecastCron();
    scheduleNext();
  }, delay);
}

console.log("[forecast-cron] started (auto-enqueue mode)");
scheduleNext();

