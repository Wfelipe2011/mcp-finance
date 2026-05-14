import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleTransacoes(_req: Request, url: URL): Promise<Response> {
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);
  const limit  = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit")  ?? "50", 10) || 50));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const data = await db.getTransacoesMensais(parsed.year, parsed.month, limit, offset);
  return jsonResponse(data);
}
