import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleRunway(_req: Request, _url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const data = await db.getRunway();
  if (!data) return errorResponse("No runway data available", 404);
  return jsonResponse(data);
}
