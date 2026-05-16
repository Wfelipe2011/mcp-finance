import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../../helpers.ts";

export async function handleForecastCategories(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const [real, forecast] = await Promise.all([
    db.forecast.getRealSpendingByCategory(3),
    db.forecast.getForecastByCategory(),
  ]);

  const hasForecast = forecast.length > 0;

  const months = [
    ...real.map((r) => ({
      year: r.year,
      month: r.month,
      type: "real" as const,
      category_pt: r.category_pt,
      group_pt: r.group_pt,
      amount: r.total_gastos,
    })),
    ...forecast.map((f) => ({
      year: f.target_year,
      month: f.target_month,
      type: "forecast" as const,
      category_pt: f.category_pt,
      group_pt: f.group_pt,
      amount: f.predicted_total,
      lower_bound: f.lower_bound,
      upper_bound: f.upper_bound,
    })),
  ];

  return jsonResponse({ has_forecast: hasForecast, months });
}
