import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { generateDailyInsightMessage } from "../../../infrastructure/ai/forecastAgent.ts";

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

export interface DailyInsightPayload {
  job_date: string;
}

export type HandlerResult =
  | { result: "done" }
  | { result: "skipped" }
  | { result: "error"; error: string };

function getSuggestedAction(category: string): string {
  const map: Record<string, string> = {
    "Delivery de comida": "cook_at_home",
    "Restaurantes": "plan_meals_ahead",
    "Alimentação e bebidas": "meal_prep",
    "Mercado e supermercado": "check_pantry_first",
    "Táxi e aplicativos": "use_public_transport",
    "Postos de combustível": "plan_trips",
    "Transporte": "use_public_transport",
    "Compras": "compare_prices",
    "Compras online": "wait_24h_before_buying",
    "Bem-estar e fitness": "check_subscription",
    "Streaming de vídeo": "audit_subscriptions",
    "Serviços digitais": "audit_subscriptions",
  };
  return map[category] ?? "review_spending";
}

export async function handleDailyInsight(
  _db: BunPgAdapter,
  tenantId: string,
  payload: DailyInsightPayload,
): Promise<HandlerResult> {
  const { job_date } = payload;
  if (!job_date) {
    return { result: "error", error: "payload missing job_date" };
  }

  const today = job_date;
  const dbTenant = new BunPgAdapter(tenantId);
  try {
    const signals = await dbTenant.forecast.getDailyHabitSignals(today);
    const predictions = await dbTenant.forecast.getDailyPrediction(today);

    // Top categoria: probability >= 0.3 E occurrences_6m >= 3
    const candidates = predictions.filter((p) => {
      const signal = signals.find((s) => s.category_pt === p.category_pt);
      return p.probability >= 0.3 && signal && signal.occurrences_6m >= 3;
    });

    if (candidates.length === 0) {
      return { result: "skipped" };
    }

    const top = candidates[0]!;
    const topSignal = signals.find((s) => s.category_pt === top.category_pt)!;

    const context = {
      insight_type: "spending_pattern",
      category_pt: top.category_pt,
      group_pt: top.group_pt,
      occurrences: topSignal.occurrences,
      avg_amount: topSignal.avg_amount,
      probability: top.probability,
      suggested_action_type: getSuggestedAction(top.category_pt),
      occurrences_6m: topSignal.occurrences_6m,
    };

    const message = await generateDailyInsightMessage(context);

    const secondaryInsights = candidates.slice(1, 4).map((p) => ({
      category_pt: p.category_pt,
      group_pt: p.group_pt,
      probability: p.probability,
      estimated_amount: p.predicted_amount,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    }));

    const contextJson = {
      insight_type: context.insight_type,
      category_pt: context.category_pt,
      group_pt: context.group_pt,
      occurrences: context.occurrences,
      avg_amount: context.avg_amount,
      probability: context.probability,
      suggested_action_type: context.suggested_action_type,
      occurrences_6m: context.occurrences_6m,
      estimated_amount: top.predicted_amount,
      lower_bound: top.lower_bound,
      upper_bound: top.upper_bound,
      signal_count: signals.length,
      secondary_insights: secondaryInsights,
    };

    await dbTenant.forecast.saveDailyInsightMessage(
      today,
      message,
      contextJson,
      AI_MODEL,
      "daily_insight",
    );

    return { result: "done" };
  } catch (err) {
    return { result: "error", error: err instanceof Error ? err.message : String(err) };
  } finally {
    await dbTenant.close();
  }
}
