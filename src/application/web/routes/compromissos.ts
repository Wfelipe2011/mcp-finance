import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleCompromissos(_req: Request, _url: URL): Promise<Response> {
  const data = await db.getCompromissosAtivos();
  return jsonResponse(data);
}
