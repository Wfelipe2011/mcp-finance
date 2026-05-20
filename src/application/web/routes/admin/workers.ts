import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";

export async function handleCreateWorker(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  let body: { name?: string; ai_base_url?: string; ai_api_key?: string | null; ai_model?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { name, ai_base_url, ai_api_key, ai_model } = body;
  if (!name || !ai_base_url || !ai_model) {
    return errorResponse("name, ai_base_url e ai_model são obrigatórios", 400);
  }

  const db = new BunPgAdapter(undefined, sql);
  const worker = await db.workers.create({ name, ai_base_url, ai_api_key: ai_api_key ?? null, ai_model });
  return jsonResponse(worker, 201);
}

export async function handleListWorkers(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const workers = await db.workers.findAll();
  return jsonResponse(workers);
}

export async function handleUpdateWorker(req: Request, url: URL, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const id = url.pathname.split("/").pop();
  if (!id) return errorResponse("ID inválido", 400);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const allowed = ["name", "ai_base_url", "ai_api_key", "ai_model", "status"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return errorResponse("Nenhum campo válido para atualizar", 400);
  }

  const db = new BunPgAdapter(undefined, sql);
  const worker = await db.workers.update(id, data as Parameters<typeof db.workers.update>[1]);
  if (!worker) return errorResponse("Worker não encontrado", 404);
  return jsonResponse(worker);
}

export async function handleDeleteWorker(req: Request, url: URL, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const id = url.pathname.split("/").pop();
  if (!id) return errorResponse("ID inválido", 400);

  const db = new BunPgAdapter(undefined, sql);
  const removed = await db.workers.remove(id);
  if (!removed) return errorResponse("Worker não encontrado", 404);
  return jsonResponse({ ok: true });
}

export async function handleQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.jobQueue.getStatsByType();
  return jsonResponse(stats);
}
