import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

export async function handleGastos(_req: Request, url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);
  const data = await db.getGastosMensais(parsed.year, parsed.month);
  return jsonResponse(data);
}
