import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const db = new BunPgAdapter();

const DEFAULT_MONTHS = 6;

export async function handleInvestimentos(_req: Request, url: URL): Promise<Response> {
  const months = Math.max(1, parseInt(url.searchParams.get("months") ?? String(DEFAULT_MONTHS), 10) || DEFAULT_MONTHS);
  const data = await db.getInvestimentosMensais(months);
  return jsonResponse(data);
}
