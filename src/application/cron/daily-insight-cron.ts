import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function runDailyInsightCron(): Promise<void> {
  const DATABASE_URL = process.env["DATABASE_URL"];
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

  const db = new BunPgAdapter();

  const tenantIds = await db.getActiveTenantsIds();
  const today = todayIso();

  console.log(
    `[daily-insight-cron] Starting enqueue for ${today} — ${tenantIds.length} active tenant(s)`
  );

  let inserted = 0;
  for (const tenantId of tenantIds) {
    const ok = await db.jobQueue.enqueue("daily_insight", tenantId, { job_date: today }, today, 0);
    if (ok) inserted++;
  }

  console.log(`[daily-insight-cron] enqueued ${inserted} new daily insight job(s)`);
  await db.close();
  console.log(`[daily-insight-cron] Enqueue complete`);
}

function scheduleNext(): void {
  const now = new Date();
  // 00:35 BRT = 03:35 UTC
  const next = new Date();
  next.setUTCHours(3, 35, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[daily-insight-cron] Next enqueue in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await runDailyInsightCron();
    scheduleNext();
  }, delay);
}

console.log("[daily-insight-cron] started");
scheduleNext();
