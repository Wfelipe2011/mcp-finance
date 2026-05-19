import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { errorResponse, jsonResponse } from "../../helpers.ts";

export async function handleForecastFeedbackDeviations(
  req: Request,
  url: URL,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const yearStr = url.searchParams.get("year");
  const monthStr = url.searchParams.get("month");

  if (!yearStr || !monthStr) {
    return errorResponse("year e month são obrigatórios", 400);
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return errorResponse("Parâmetros year/month inválidos", 400);
  }

  const db = new BunPgAdapter(tenantId, sql);
  const deviations = await (db as any).feedback.getDeviations(year, month);

  // Sort by deviation_pct desc (already done in SQL, but ensure)
  const sorted = [...deviations].sort((a: any, b: any) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct));

  return jsonResponse(sorted);
}

export async function handleForecastFeedbackSave(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("JSON inválido", 400);
  }

  if (!Array.isArray(body)) {
    return errorResponse("Body deve ser um array de feedback", 400);
  }

  for (const item of body) {
    if (typeof item !== "object" || item === null) {
      return errorResponse("Cada item deve ser um objeto", 400);
    }
    const fb = item as Record<string, unknown>;
    if (typeof fb["prediction_id"] !== "number" && typeof fb["prediction_id"] !== "string") {
      return errorResponse("prediction_id é obrigatório", 400);
    }
    if (fb["rating"] !== "up" && fb["rating"] !== "down") {
      return errorResponse("rating deve ser 'up' ou 'down'", 400);
    }
  }

  const items = (body as Record<string, unknown>[]).map(fb => ({
    prediction_id: Number(fb["prediction_id"]),
    rating: fb["rating"] as string,
    correction_tag: (fb["correction_tag"] as string | undefined) ?? null,
  }));

  const db = new BunPgAdapter(tenantId, sql);
  const saved = await (db as any).feedback.saveFeedback(items);

  return jsonResponse({ saved });
}

export async function handleForecastFeedbackRetrain(
  req: Request,
  tenantId: string,
  sql: SQL,
): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);

  const summary = await (db as any).feedback.getFeedbackSummary(tenantId);

  if (summary.count < 3) {
    return errorResponse("minimum 3 rated items required", 400);
  }

  await (db as any).feedback.enqueueRetrain(tenantId);

  return jsonResponse({ enqueued: true });
}
