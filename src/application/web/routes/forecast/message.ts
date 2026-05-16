import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../../helpers.ts";

export async function handleForecastMessage(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const msg = await db.forecast.getTodayMessage();
  if (!msg) {
    return jsonResponse({ has_message: false, message_pt: null, message_date: null });
  }
  return jsonResponse({ has_message: true, message_pt: msg.message_pt, message_date: msg.message_date });
}
