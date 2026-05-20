import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleListRegras(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  try {
    const regras = await db.categoryRules.list();
    return jsonResponse(regras);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleCreateRegra(req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { value, category_id, note } = body;
  if (typeof value !== "string" || value.trim() === "") {
    return errorResponse("value é obrigatório e deve ser texto não-vazio", 400);
  }
  if (typeof category_id !== "string" || category_id.trim() === "") {
    return errorResponse("category_id é obrigatório", 400);
  }

  try {
    const regra = await db.categoryRules.create(
      value.trim(),
      category_id.trim(),
      typeof note === "string" && note.trim() !== "" ? note.trim() : undefined,
    );
    return jsonResponse(regra, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // UNIQUE violation (pattern já existe para o tenant)
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return errorResponse("Regra com este padrão já existe para este tenant", 409);
    }
    // FK violation (category_id não existe)
    if (msg.includes("foreign key") || msg.includes("violates")) {
      return errorResponse("category_id inválido", 400);
    }
    return errorResponse(msg, 500);
  }
}

export async function handleUpdateRegra(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const fields: Partial<{ value: string; category_id: string; note: string; is_active: boolean }> = {};
  if (typeof body["value"] === "string") fields.value = body["value"].trim();
  if (typeof body["category_id"] === "string") fields.category_id = body["category_id"].trim();
  if (typeof body["note"] === "string") fields.note = body["note"].trim();
  if (typeof body["is_active"] === "boolean") fields.is_active = body["is_active"];

  try {
    const updated = await db.categoryRules.update(id, fields);
    if (!updated) return errorResponse("Regra não encontrada", 404);
    return jsonResponse(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleDeleteRegra(_req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  try {
    const removed = await db.categoryRules.remove(id);
    if (!removed) return errorResponse("Regra não encontrada", 404);
    return new Response(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleReordenarRegra(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  // path: /api/regras/:id/prioridade
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 2]; // id vem antes de /prioridade
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { direction } = body;
  if (direction !== "up" && direction !== "down") {
    return errorResponse("direction deve ser 'up' ou 'down'", 400);
  }

  try {
    await db.categoryRules.reorder(id, direction);
    const regras = await db.categoryRules.list();
    return jsonResponse(regras);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleAplicarHistorico(_req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  // path: /api/regras/:id/aplicar-historico
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 2];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  try {
    const affected = await db.categoryRules.applyToHistory(id);
    return jsonResponse({ affected });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
