import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleListCategorias(_req: Request, _tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(undefined, sql);
  try {
    const categorias = await db.categories.list();
    return jsonResponse(categorias);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
