import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

const db = new BunPgAdapter();

export async function handleRunway(_req: Request, _url: URL): Promise<Response> {
  const data = await db.getRunway();
  if (!data) return errorResponse("No runway data available", 404);
  return jsonResponse(data);
}
