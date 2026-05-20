import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { generateForecastMessage } from "../../../infrastructure/ai/forecastAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

export interface ForecastPayload {
  job_date: string;
}

export type HandlerResult =
  | { result: "done" }
  | { result: "skipped" }
  | { result: "error"; error: string };

export async function handleForecast(
  _db: BunPgAdapter,
  tenantId: string,
  payload: ForecastPayload,
): Promise<HandlerResult> {
  const { job_date } = payload;
  if (!job_date) {
    return { result: "error", error: "payload missing job_date" };
  }

  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const predictions = await dbTenant.forecast.getPredictionsByGroup();

    if (predictions.length === 0) {
      return { result: "error", error: "no predictions available for tenant" };
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

    return { result: "done" };
  } catch (err) {
    return { result: "error", error: err instanceof Error ? err.message : String(err) };
  } finally {
    await dbTenant.close();
  }
}
