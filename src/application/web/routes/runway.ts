import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleRunway(_req: Request, _url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const data = await db.getRunway();
  if (!data) return errorResponse("No runway data available", 404);
  return jsonResponse(data);
}
