import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handlePatrimonio(_req: Request, _url: URL): Promise<Response> {
  const data = await db.getPatrimonio();
  return jsonResponse(data);
}
