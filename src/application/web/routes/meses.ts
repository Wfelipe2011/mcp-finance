import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleMeses(_req: Request, _url: URL): Promise<Response> {
  const data = await db.getMesesDisponiveis();
  return jsonResponse(data);
}
