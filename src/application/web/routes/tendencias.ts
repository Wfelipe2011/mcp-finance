import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

export async function handleTendencias(_req: Request, _url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const data = await db.getTendencias();
  return jsonResponse(data);
}
