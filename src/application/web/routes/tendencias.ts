import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleTendencias(_req: Request, _url: URL): Promise<Response> {
  const data = await db.getTendencias();
  return jsonResponse(data);
}
