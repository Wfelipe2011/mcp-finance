import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse, parseMonth } from "../helpers.ts";

export async function handleDigest(_req: Request, url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const parsed = parseMonth(url.searchParams.get("month"));
  if (!parsed) return errorResponse("Invalid month format. Use YYYY-MM", 400);
  const data = await db.getDigestMensal(parsed.year, parsed.month);
  if (!data) return errorResponse("No digest for this month", 404);
  return jsonResponse(data);
}
