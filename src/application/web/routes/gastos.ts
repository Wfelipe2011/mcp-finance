import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleGastos(_req: Request, url: URL): Promise<Response> {
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);
  const data = await db.getGastosMensais(parsed.year, parsed.month);
  return jsonResponse(data);
}
