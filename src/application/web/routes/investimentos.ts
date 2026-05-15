import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const DEFAULT_MONTHS = 6;

export async function handleInvestimentos(_req: Request, url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const months = Math.max(1, parseInt(url.searchParams.get("months") ?? String(DEFAULT_MONTHS), 10) || DEFAULT_MONTHS);
  const data = await db.getInvestimentosMensais(months);
  return jsonResponse(data);
}
