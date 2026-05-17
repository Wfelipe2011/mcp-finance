import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
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
