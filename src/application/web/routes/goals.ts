import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleGetGoals(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  try {
    const goals = await db.goals.getAll();
    return jsonResponse(goals);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleCreateGoal(req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Body inválido", 400);
  }

  const { name, goal_type, target_amount, category_group, deadline, notes } = body;

  if (typeof name !== "string" || name.trim() === "") {
    return errorResponse("name é obrigatório e deve ser texto não-vazio", 400);
  }
  if (goal_type !== "saving" && goal_type !== "spending") {
    return errorResponse("goal_type deve ser 'saving' ou 'spending'", 400);
  }
  if (typeof target_amount !== "number" || target_amount <= 0) {
    return errorResponse("target_amount deve ser um número maior que zero", 400);
  }
  if (goal_type === "spending" && (typeof category_group !== "string" || category_group.trim() === "")) {
    return errorResponse("category_group é obrigatório para metas do tipo 'spending'", 400);
  }

  try {
    const goal = await db.goals.create({
      name: name.trim(),
      goal_type,
      target_amount,
      current_amount: 0,
      category_group: goal_type === "spending" ? (category_group as string).trim() : null,
      deadline: typeof deadline === "string" && deadline.trim() !== "" ? deadline.trim() : null,
      status: "active",
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
    });
    return jsonResponse(goal, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleUpdateGoal(req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
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

  const allowed = ["name", "current_amount", "deadline", "status", "notes", "target_amount"] as const;
  type AllowedKey = typeof allowed[number];
  const data: Partial<Record<AllowedKey, unknown>> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (data.status !== undefined && !["active", "achieved", "abandoned"].includes(data.status as string)) {
    return errorResponse("status deve ser 'active', 'achieved' ou 'abandoned'", 400);
  }
  if (data.target_amount !== undefined && (typeof data.target_amount !== "number" || data.target_amount <= 0)) {
    return errorResponse("target_amount deve ser um número maior que zero", 400);
  }

  try {
    const updated = await db.goals.update(id, data as Parameters<typeof db.goals.update>[1]);
    if (!updated) return errorResponse("Meta não encontrada", 404);
    return jsonResponse(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}

export async function handleDeleteGoal(_req: Request, url: URL, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  const segments = url.pathname.split("/");
  const idStr = segments[segments.length - 1];
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return errorResponse("ID inválido", 400);

  try {
    await db.goals.remove(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
