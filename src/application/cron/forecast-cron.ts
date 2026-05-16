import { BunPgAdapter } from "../../infrastructure/db/BunPgAdapter.ts";
import { generateForecastMessage } from "../../infrastructure/ai/forecastAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function runForecastCron(): Promise<void> {
  const rootDb = new BunPgAdapter();
  const tenantIds = await rootDb.getActiveTenantsIds();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = todayIso();

  console.log(
    `[forecast-cron] Starting run for ${today} — ${tenantIds.length} active tenant(s)`
  );

  for (const tenantId of tenantIds) {
    const db = new BunPgAdapter(tenantId);
    try {
      const predictions = await db.forecast.getPredictionsByGroup();

      if (predictions.length === 0) {
        console.log(`[forecast-cron] tenant=${tenantId} no predictions — skipped`);
        continue;
      }

      const spending = await db.forecast.getCurrentMonthSpendingByGroup();

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

      await db.forecast.saveDailyMessage(today, message, contextJson, AI_MODEL);

      console.log(`[forecast-cron] tenant=${tenantId} message=saved`);
    } catch (err) {
      console.error(`[forecast-cron] tenant=${tenantId} error:`, err);
    }
  }

  console.log(`[forecast-cron] Run complete`);
}

function scheduleNext(): void {
  const now = new Date();
  // 00:30 BRT = 03:30 UTC
  const next = new Date();
  next.setUTCHours(3, 30, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next.getTime() - now.getTime();
  console.log(`[forecast-cron] Next run in ${Math.round(delay / 60000)} minutes`);
  setTimeout(async () => {
    await runForecastCron();
    scheduleNext();
  }, delay);
}

console.log("[forecast-cron] started");
scheduleNext();
