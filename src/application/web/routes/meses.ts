import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

export async function handleMeses(_req: Request, _url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const data = await db.getMesesDisponiveis();
  return jsonResponse(data);
}
