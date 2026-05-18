import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { generateDailyInsightMessage, getSuggestedAction } from "../../../../infrastructure/ai/forecastAgent.ts";
import { errorResponse, jsonResponse } from "../../helpers.ts";

export async function handleForecastDaily(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Get daily insight for today
  const insight = await db.forecast.getDailyInsight(today);

  if (!insight) {
    return new Response(null, { status: 204 });
  }

  // Parse context_json to extract fields
  const ctx = insight.context_json as Record<string, unknown>;

  // Get secondary insights from predictions
  const predictions = await db.forecast.getDailyPrediction(today);
  const secondaryInsights = predictions
    .filter((p: any) => p.probability >= 0.3 && p.category_pt !== ctx["category_pt"])
    .slice(0, 3)
    .map((p: any) => ({
      category_pt: p.category_pt,
      group_pt: p.group_pt,
      probability: p.probability,
      estimated_amount: p.predicted_amount,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    }));

  return jsonResponse({
    has_insight: true,
    insight_type: ctx["insight_type"] ?? "spending_pattern",
    message_pt: insight.message_pt,
    category_pt: ctx["category_pt"] ?? null,
    group_pt: ctx["group_pt"] ?? null,
    probability: ctx["probability"] ?? null,
    estimated_amount: ctx["estimated_amount"] ?? null,
    lower_bound: ctx["lower_bound"] ?? null,
    upper_bound: ctx["upper_bound"] ?? null,
    signal_count: ctx["signal_count"] ?? null,
    period_months: 6,
    insight_date: insight.message_date,
    secondary_insights: secondaryInsights,
  });
}

const AI_MODEL = process.env["AI_MODEL"] ?? "gemma-4";

export async function handleForecastDailyRegenerate(
  _req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const today = new Date().toISOString().slice(0, 10);

  const [signals, predictions] = await Promise.all([
    db.forecast.getDailyHabitSignals(today),
    db.forecast.getDailyPrediction(today),
  ]);

  const candidates = predictions.filter((p: any) => {
    const signal = signals.find((s: any) => s.category_pt === p.category_pt);
    return p.probability >= 0.3 && signal && signal.occurrences_6m >= 3;
  });

  if (candidates.length === 0) {
    return errorResponse("Sem previsões disponíveis para hoje", 409);
  }

  const top = candidates[0]!;
  const topSignal = signals.find((s: any) => s.category_pt === (top as any).category_pt)!;

  const context = {
    insight_type: "spending_pattern",
    category_pt: (top as any).category_pt,
    group_pt: (top as any).group_pt,
    occurrences: (topSignal as any).occurrences,
    avg_amount: (topSignal as any).avg_amount,
    probability: (top as any).probability,
    suggested_action_type: getSuggestedAction((top as any).category_pt),
    occurrences_6m: (topSignal as any).occurrences_6m,
  };

  const message = await generateDailyInsightMessage(context);

  const secondaryInsights = candidates.slice(1, 4).map((p: any) => ({
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
    estimated_amount: (top as any).predicted_amount,
    lower_bound: (top as any).lower_bound,
    upper_bound: (top as any).upper_bound,
    signal_count: signals.length,
    secondary_insights: secondaryInsights,
  };

  await db.forecast.saveDailyInsightMessage(today, message, contextJson, AI_MODEL, "daily_insight");

  return jsonResponse({
    has_insight: true,
    insight_type: context.insight_type,
    message_pt: message,
    category_pt: context.category_pt,
    group_pt: context.group_pt,
    probability: context.probability,
    estimated_amount: contextJson.estimated_amount,
    lower_bound: contextJson.lower_bound,
    upper_bound: contextJson.upper_bound,
    signal_count: signals.length,
    period_months: 6,
    insight_date: today,
    secondary_insights: secondaryInsights,
  });
}
