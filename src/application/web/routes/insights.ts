import { SQL } from "bun";
import { jsonResponse } from "../helpers.ts";

export type InsightType = "anomaly" | "digest" | "daily" | null;

export interface InsightTodayResult {
  type: InsightType;
  text: string | null;
  score?: number;
}

export async function handleInsightToday(
  _req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  const result = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

    // Priority 1: anomaly with score > 0.6 in current month
    const anomalies = await tx`
      SELECT
        i.anomaly_score,
        COALESCE(i.merchant_name, t.description) AS label
      FROM ai_transaction_insights i
      JOIN transactions t ON t.id = i.transaction_id
      WHERE i.anomaly_score > 0.6
        AND LEFT(t.date, 7) = ${monthPrefix}
      ORDER BY i.anomaly_score DESC
      LIMIT 1
    `;
    if (anomalies.length > 0) {
      const row = anomalies[0] as { anomaly_score: number | string; label: string };
      const anomalyScore = Number(row.anomaly_score);
      return {
        type: "anomaly" as InsightType,
        text: `Transação suspeita detectada: "${row.label}" — score de anomalia ${(anomalyScore * 100).toFixed(0)}%.`,
        score: anomalyScore,
      };
    }

    // Priority 2: monthly digest narrative for current month
    const digests = await tx`
      SELECT narrative_pt
      FROM ai_monthly_digest
      WHERE year = ${year} AND month = ${month}
      LIMIT 1
    `;
    if (digests.length > 0) {
      const row = digests[0] as { narrative_pt: string | null };
      if (row.narrative_pt) {
        const truncated = row.narrative_pt.length > 200
          ? row.narrative_pt.slice(0, 200).trimEnd() + "…"
          : row.narrative_pt;
        return {
          type: "digest" as InsightType,
          text: truncated,
        };
      }
    }

    // Priority 3: daily insight message for today
    const daily = await tx`
      SELECT message_pt
      FROM forecast_ai_messages
      WHERE message_date = ${today}::date
        AND message_type = 'daily_insight'
        AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (daily.length > 0) {
      const row = daily[0] as { message_pt: string };
      return {
        type: "daily" as InsightType,
        text: row.message_pt,
      };
    }

    return { type: null as InsightType, text: null };
  });

  return jsonResponse(result satisfies InsightTodayResult);
}
