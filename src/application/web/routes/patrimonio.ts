import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

export async function handlePatrimonio(_req: Request, _url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const data = await db.getPatrimonio();
  return jsonResponse(data);
}
