import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleGetUsers(_req: Request, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  try {
    const users = await db.users.getAll();
    return jsonResponse(users);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleUpdateUser(req: Request, url: URL, tenantId: string): Promise<Response> {
  const db = new BunPgAdapter(tenantId);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  let body: { display_name?: string };
  try {
    body = (await req.json()) as { display_name?: string };
  } catch {
    return errorResponse("Body inválido", 400);
  }

  if (typeof body.display_name !== "string") {
    return errorResponse("display_name é obrigatório", 400);
  }

  try {
    const updated = await db.users.updateDisplayName(id, body.display_name);
    if (!updated) return errorResponse("Usuário não encontrado ou display_name inválido", 404);
    return jsonResponse(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
